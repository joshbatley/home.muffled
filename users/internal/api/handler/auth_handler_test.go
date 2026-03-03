package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"users/internal/auth"
	"users/internal/user"

	"github.com/google/uuid"
)

type mockUserStore struct {
	user *user.User
	err  error
}

func (m *mockUserStore) GetByUsername(ctx context.Context, username string) (*user.User, error) {
	return m.user, m.err
}

type mockRefreshStore struct {
	token  *auth.RefreshToken
	err    error
	revoke func(ctx context.Context, id string) error
}

func (m *mockRefreshStore) Create(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (*auth.RefreshToken, error) {
	return m.token, m.err
}

func (m *mockRefreshStore) GetByHash(ctx context.Context, tokenHash string) (*auth.RefreshToken, error) {
	return m.token, m.err
}

func (m *mockRefreshStore) Revoke(ctx context.Context, id string) error {
	if m.revoke != nil {
		return m.revoke(ctx, id)
	}
	return nil
}

func TestLogin_ValidCredentials_ReturnsTokens(t *testing.T) {
	// Arrange
	passwordHash, _ := auth.HashPassword("password123")
	testUser := &user.User{
		ID:                  uuid.New(),
		Username:            "testuser",
		PasswordHash:        passwordHash,
		ForcePasswordChange: false,
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{user: testUser},
		RefreshStore:    &mockRefreshStore{token: &auth.RefreshToken{}},
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	body := `{"username":"testuser","password":"password123"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	h.Login(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if _, ok := resp["access_token"].(string); !ok || resp["access_token"] == "" {
		t.Error("expected access_token in response")
	}
	if _, ok := resp["refresh_token"].(string); !ok || resp["refresh_token"] == "" {
		t.Error("expected refresh_token in response")
	}
}

func TestLogin_InvalidCredentials_Returns401(t *testing.T) {
	// Arrange
	passwordHash, _ := auth.HashPassword("password123")
	testUser := &user.User{
		ID:                  uuid.New(),
		Username:            "testuser",
		PasswordHash:        passwordHash,
		ForcePasswordChange: false,
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{user: testUser},
		RefreshStore:    &mockRefreshStore{token: &auth.RefreshToken{}},
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	body := `{"username":"testuser","password":"wrongpassword"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	h.Login(rec, req)

	// Assert
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestLogin_ForcePasswordChange_SetsRestrictedClaim(t *testing.T) {
	// Arrange
	passwordHash, _ := auth.HashPassword("temppass")
	testUser := &user.User{
		ID:                  uuid.New(),
		Username:            "newuser",
		PasswordHash:        passwordHash,
		ForcePasswordChange: true,
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{user: testUser},
		RefreshStore:    &mockRefreshStore{token: &auth.RefreshToken{}},
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	body := `{"username":"newuser","password":"temppass"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	h.Login(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["force_password_change"] != true {
		t.Errorf("expected login response force_password_change true, got %v", resp["force_password_change"])
	}

	// Validate the access token contains force_password_change claim
	accessToken, _ := resp["access_token"].(string)
	claims, err := auth.ValidateAccessToken([]byte("test-secret"), accessToken)
	if err != nil {
		t.Fatalf("failed to validate access token: %v", err)
	}

	if !claims.ForcePasswordChange {
		t.Error("expected ForcePasswordChange claim to be true")
	}
}

func TestRefresh_ValidToken_ReturnsNewAccessToken(t *testing.T) {
	// Arrange
	testUserID := uuid.New()
	refreshToken := "valid-refresh-token"
	refreshHash := auth.HashRefreshToken(refreshToken)

	mockRefresh := &mockRefreshStore{
		token: &auth.RefreshToken{
			ID:        "token-id",
			UserID:    testUserID.String(),
			TokenHash: refreshHash,
			ExpiresAt: time.Now().Add(24 * time.Hour),
			Revoked:   false,
		},
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{},
		RefreshStore:    mockRefresh,
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	body := `{"refresh_token":"valid-refresh-token"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	h.Refresh(rec, req)

	// Assert
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}

	var resp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp["access_token"] == "" {
		t.Error("expected access_token in response")
	}
}

func TestRefresh_InvalidToken_Returns401(t *testing.T) {
	// Arrange
	mockRefresh := &mockRefreshStore{
		token: nil,
		err:   errors.New("not found"),
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{},
		RefreshStore:    mockRefresh,
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	body := `{"refresh_token":"invalid-token"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/refresh", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Act
	h.Refresh(rec, req)

	// Assert
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestLogout_ValidToken_RevokesAndReturns204(t *testing.T) {
	refreshToken := "valid-refresh-token"
	refreshHash := auth.HashRefreshToken(refreshToken)
	revoked := false
	mockRefresh := &mockRefreshStore{
		token: &auth.RefreshToken{
			ID:        "token-123",
			UserID:    uuid.New().String(),
			TokenHash: refreshHash,
			ExpiresAt: time.Now().Add(24 * time.Hour),
			Revoked:   false,
		},
		revoke: func(ctx context.Context, id string) error {
			if id != "token-123" {
				t.Errorf("expected Revoke with id token-123, got %q", id)
			}
			revoked = true
			return nil
		},
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{},
		RefreshStore:    mockRefresh,
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	body := `{"refresh_token":"` + refreshToken + `"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/logout", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.Logout(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status %d, got %d", http.StatusNoContent, rec.Code)
	}
	if !revoked {
		t.Error("expected Revoke to be called")
	}
}

func TestLogout_InvalidOrMissingToken_Idempotent204(t *testing.T) {
	mockRefresh := &mockRefreshStore{
		token: nil,
		err:   errors.New("not found"),
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{},
		RefreshStore:    mockRefresh,
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	tests := []struct {
		name string
		body string
	}{
		{"missing token", `{}`},
		{"empty refresh_token", `{"refresh_token":""}`},
		{"invalid token", `{"refresh_token":"invalid"}`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/v1/auth/logout", bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			h.Logout(rec, req)
			if rec.Code != http.StatusNoContent {
				t.Errorf("expected status %d, got %d", http.StatusNoContent, rec.Code)
			}
		})
	}
}

func TestLogout_AlreadyRevoked_Idempotent204(t *testing.T) {
	refreshToken := "valid-refresh-token"
	refreshHash := auth.HashRefreshToken(refreshToken)
	mockRefresh := &mockRefreshStore{
		token: &auth.RefreshToken{
			ID:        "token-123",
			UserID:    uuid.New().String(),
			TokenHash: refreshHash,
			Revoked:   true,
		},
		revoke: func(ctx context.Context, id string) error {
			t.Error("Revoke should not be called when token already revoked")
			return nil
		},
	}

	h := NewAuthHandler(AuthHandlerConfig{
		UserStore:       &mockUserStore{},
		RefreshStore:    mockRefresh,
		JWTSecret:       []byte("test-secret"),
		AccessTokenTTL:  15 * time.Minute,
		RefreshTokenTTL: 7 * 24 * time.Hour,
	})

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/logout", bytes.NewBufferString(`{"refresh_token":"`+refreshToken+`"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.Logout(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Errorf("expected status %d, got %d", http.StatusNoContent, rec.Code)
	}
}
