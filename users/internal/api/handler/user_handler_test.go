package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"users/internal/api/middleware"
	"users/internal/auth"
	"users/internal/role"
	"users/internal/user"

	"github.com/google/uuid"
)

type mockUserStoreForUsers struct {
	users []user.User
	err   error
}

func (m *mockUserStoreForUsers) List(ctx context.Context) ([]user.User, error) {
	return m.users, m.err
}

func (m *mockUserStoreForUsers) GetByID(ctx context.Context, id uuid.UUID) (*user.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return &u, nil
		}
	}
	return nil, m.err
}

func (m *mockUserStoreForUsers) Create(ctx context.Context, u *user.User) error {
	m.users = append(m.users, *u)
	return m.err
}

func (m *mockUserStoreForUsers) Update(ctx context.Context, u *user.User) error {
	for i, existing := range m.users {
		if existing.ID == u.ID {
			m.users[i] = *u
			return m.err
		}
	}
	return m.err
}

type mockUserRoleStoreForMe struct {
	roles       []role.Role
	permissions []role.Permission
	err         error
}

func (m *mockUserRoleStoreForMe) GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]role.Role, error) {
	return m.roles, m.err
}

func (m *mockUserRoleStoreForMe) GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]role.Permission, error) {
	return m.permissions, m.err
}

func TestListUsers_AsAdmin_Succeeds(t *testing.T) {
	// Arrange
	testUsers := []user.User{
		{ID: uuid.New(), Username: "user1"},
		{ID: uuid.New(), Username: "user2"},
	}

	h := NewUserHandler(UserHandlerConfig{
		UserStore: &mockUserStoreForUsers{users: testUsers},
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/users", nil)
	// Simulate admin claims in context
	claims := &auth.Claims{UserID: uuid.New().String(), Roles: []string{"admin"}}
	ctx := context.WithValue(req.Context(), claimsKeyForTest, claims)
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()

	// Act
	h.ListUsers(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var resp []map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(resp) != 2 {
		t.Errorf("expected 2 users, got %d", len(resp))
	}
}

// claimsKeyForTest matches the key used in middleware
type claimsContextKey string

const claimsKeyForTest claimsContextKey = "claims"

func TestListUsers_AsNonAdmin_Returns403(t *testing.T) {
	// Arrange
	h := NewUserHandler(UserHandlerConfig{
		UserStore: &mockUserStoreForUsers{users: []user.User{}},
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/users", nil)
	// Simulate non-admin claims in context using middleware's SetClaimsForTest
	claims := &auth.Claims{UserID: uuid.New().String(), Roles: []string{"viewer"}}
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))

	rec := httptest.NewRecorder()

	// Apply Admin middleware
	handler := middleware.Admin(http.HandlerFunc(h.ListUsers))
	handler.ServeHTTP(rec, req)

	// Assert
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, rec.Code)
	}
}

func TestGetUser_OwnUser_AsNonAdmin_Succeeds(t *testing.T) {
	// Arrange
	userID := uuid.New()
	testUser := user.User{ID: userID, Username: "testuser"}

	store := &mockUserStoreForUsers{users: []user.User{testUser}}
	h := NewUserHandler(UserHandlerConfig{
		UserStore: store,
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/users/"+userID.String(), nil)
	req.SetPathValue("id", userID.String())
	// Non-admin requesting their own user
	claims := &auth.Claims{UserID: userID.String(), Roles: []string{"viewer"}}
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))

	rec := httptest.NewRecorder()

	// Act
	h.GetUser(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["id"] != userID.String() {
		t.Errorf("expected id %s, got %s", userID.String(), resp["id"])
	}
}

func TestGetUser_OtherUser_AsNonAdmin_Returns403(t *testing.T) {
	// Arrange
	otherUserID := uuid.New()
	myUserID := uuid.New()

	store := &mockUserStoreForUsers{users: []user.User{{ID: otherUserID, Username: "other"}}}
	h := NewUserHandler(UserHandlerConfig{
		UserStore: store,
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/users/"+otherUserID.String(), nil)
	req.SetPathValue("id", otherUserID.String())
	// Non-admin requesting another user's data
	claims := &auth.Claims{UserID: myUserID.String(), Roles: []string{"viewer"}}
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))

	rec := httptest.NewRecorder()

	// Act
	h.GetUser(rec, req)

	// Assert
	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, rec.Code)
	}
}

func TestMe_ReturnsCurrentUser(t *testing.T) {
	userID := uuid.New()
	testUser := user.User{ID: userID, Username: "meuser"}

	store := &mockUserStoreForUsers{users: []user.User{testUser}}
	h := NewUserHandler(UserHandlerConfig{UserStore: store})

	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	claims := &auth.Claims{UserID: userID.String(), Roles: []string{"viewer"}}
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))

	rec := httptest.NewRecorder()
	h.Me(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["id"] != userID.String() || resp["username"] != "meuser" {
		t.Errorf("got %v", resp)
	}
}

func TestMe_ReturnsForcePasswordChangeRolesPermissions_WhenStoreSet(t *testing.T) {
	userID := uuid.New()
	testUser := user.User{
		ID:                  userID,
		Username:            "meuser",
		ForcePasswordChange: true,
	}
	roleStore := &mockUserRoleStoreForMe{
		roles: []role.Role{
			{ID: uuid.New(), Name: "admin", CreatedAt: time.Now()},
			{ID: uuid.New(), Name: "viewer", CreatedAt: time.Now()},
		},
		permissions: []role.Permission{
			{ID: uuid.New(), Key: "users:read", CreatedAt: time.Now()},
			{ID: uuid.New(), Key: "users:write", CreatedAt: time.Now()},
		},
	}
	userStore := &mockUserStoreForUsers{users: []user.User{testUser}}
	h := NewUserHandler(UserHandlerConfig{
		UserStore:          userStore,
		UserRoleStoreForMe: roleStore,
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String()}))
	rec := httptest.NewRecorder()
	h.Me(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["force_password_change"] != true {
		t.Errorf("expected force_password_change true, got %v", resp["force_password_change"])
	}
	roles, _ := resp["roles"].([]interface{})
	if len(roles) != 2 {
		t.Errorf("expected 2 roles, got %d", len(roles))
	}
	perms, _ := resp["permissions"].([]interface{})
	if len(perms) != 2 {
		t.Errorf("expected 2 permissions, got %d", len(perms))
	}
}

func TestCreateUser_AsAdmin_Succeeds(t *testing.T) {
	// Arrange
	store := &mockUserStoreForUsers{}
	h := NewUserHandler(UserHandlerConfig{
		UserStore: store,
	})

	body := `{"username":"newuser","password":"temppass123"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/users", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	claims := &auth.Claims{UserID: uuid.New().String(), Roles: []string{"admin"}}
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))

	rec := httptest.NewRecorder()

	// Act
	h.CreateUser(rec, req)

	// Assert
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status %d, got %d: %s", http.StatusCreated, rec.Code, rec.Body.String())
	}

	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["username"] != "newuser" {
		t.Errorf("expected username newuser, got %s", resp["username"])
	}
	if resp["id"] == "" {
		t.Error("expected id in response")
	}
}

func TestUpdateUser_OwnUser_Succeeds(t *testing.T) {
	// Arrange
	userID := uuid.New()
	existingUser := user.User{ID: userID, Username: "oldname"}

	store := &mockUserStoreForUsers{users: []user.User{existingUser}}
	h := NewUserHandler(UserHandlerConfig{
		UserStore: store,
	})

	body := `{"username":"newname"}`
	req := httptest.NewRequest(http.MethodPut, "/v1/users/"+userID.String(), bytes.NewBufferString(body))
	req.SetPathValue("id", userID.String())
	req.Header.Set("Content-Type", "application/json")
	claims := &auth.Claims{UserID: userID.String(), Roles: []string{"viewer"}}
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))

	rec := httptest.NewRecorder()

	// Act
	h.UpdateUser(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["username"] != "newname" {
		t.Errorf("expected username newname, got %s", resp["username"])
	}
}

func TestMe_ReturnsAvatarURL(t *testing.T) {
	userID := uuid.New()
	testUser := user.User{ID: userID, Username: "meuser", AvatarURL: "https://example.com/avatar.png"}

	store := &mockUserStoreForUsers{users: []user.User{testUser}}
	h := NewUserHandler(UserHandlerConfig{UserStore: store})

	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String()}))
	rec := httptest.NewRecorder()
	h.Me(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["avatar_url"] != "https://example.com/avatar.png" {
		t.Errorf("expected avatar_url in Me response, got %v", resp["avatar_url"])
	}
}

func TestGetUser_ReturnsAvatarURL(t *testing.T) {
	userID := uuid.New()
	testUser := user.User{ID: userID, Username: "getuser", AvatarURL: "https://cdn.example.com/photo.jpg"}

	store := &mockUserStoreForUsers{users: []user.User{testUser}}
	h := NewUserHandler(UserHandlerConfig{UserStore: store})

	req := httptest.NewRequest(http.MethodGet, "/v1/users/"+userID.String(), nil)
	req.SetPathValue("id", userID.String())
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String(), Roles: []string{"viewer"}}))
	rec := httptest.NewRecorder()
	h.GetUser(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["avatar_url"] != "https://cdn.example.com/photo.jpg" {
		t.Errorf("expected avatar_url in GetUser response, got %v", resp["avatar_url"])
	}
}

func TestUpdateUser_SetsAvatarURL(t *testing.T) {
	userID := uuid.New()
	existingUser := user.User{ID: userID, Username: "user"}

	store := &mockUserStoreForUsers{users: []user.User{existingUser}}
	h := NewUserHandler(UserHandlerConfig{UserStore: store})

	body := `{"username":"user","avatar_url":"https://example.com/new-avatar.png"}`
	req := httptest.NewRequest(http.MethodPut, "/v1/users/"+userID.String(), bytes.NewBufferString(body))
	req.SetPathValue("id", userID.String())
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String(), Roles: []string{"viewer"}}))
	rec := httptest.NewRecorder()

	h.UpdateUser(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	var resp map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp["avatar_url"] != "https://example.com/new-avatar.png" {
		t.Errorf("expected avatar_url in response, got %v", resp["avatar_url"])
	}
	if store.users[0].AvatarURL != "https://example.com/new-avatar.png" {
		t.Errorf("expected store user AvatarURL to be set, got %q", store.users[0].AvatarURL)
	}
}

func TestChangePassword_OwnUser_SucceedsAndClearsForcePasswordChange(t *testing.T) {
	// Arrange
	userID := uuid.New()
	oldHash, _ := auth.HashPassword("oldpass")
	existingUser := user.User{
		ID:                  userID,
		Username:            "testuser",
		PasswordHash:        oldHash,
		ForcePasswordChange: true,
	}

	store := &mockUserStoreForUsers{users: []user.User{existingUser}}
	h := NewUserHandler(UserHandlerConfig{
		UserStore: store,
	})

	body := `{"old_password":"oldpass","new_password":"newpass123"}`
	req := httptest.NewRequest(http.MethodPut, "/v1/users/"+userID.String()+"/password", bytes.NewBufferString(body))
	req.SetPathValue("id", userID.String())
	req.Header.Set("Content-Type", "application/json")
	claims := &auth.Claims{UserID: userID.String(), Roles: []string{"viewer"}}
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))

	rec := httptest.NewRecorder()

	// Act
	h.ChangePassword(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	// Verify ForcePasswordChange was cleared
	updatedUser := store.users[0]
	if updatedUser.ForcePasswordChange {
		t.Error("expected ForcePasswordChange to be false after password change")
	}

	// Verify password was actually changed
	if err := auth.ComparePassword(updatedUser.PasswordHash, "newpass123"); err != nil {
		t.Error("expected new password to be set")
	}
}
