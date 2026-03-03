package seed

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"users/internal/role"
	"users/internal/user"
)

type mockUserStore struct {
	users map[string]*user.User
}

func newMockUserStore() *mockUserStore {
	return &mockUserStore{users: make(map[string]*user.User)}
}

func (m *mockUserStore) Create(ctx context.Context, u *user.User) error {
	m.users[u.Username] = u
	return nil
}

func (m *mockUserStore) GetByID(ctx context.Context, id uuid.UUID) (*user.User, error) {
	for _, u := range m.users {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, user.ErrNotFound
}

func (m *mockUserStore) GetByUsername(ctx context.Context, username string) (*user.User, error) {
	if u, ok := m.users[username]; ok {
		return u, nil
	}
	return nil, user.ErrNotFound
}

func (m *mockUserStore) List(ctx context.Context) ([]user.User, error) {
	var result []user.User
	for _, u := range m.users {
		result = append(result, *u)
	}
	return result, nil
}

func (m *mockUserStore) Update(ctx context.Context, u *user.User) error {
	if _, ok := m.users[u.Username]; !ok {
		return user.ErrNotFound
	}
	m.users[u.Username] = u
	return nil
}

func TestSeedAdmin_creates_user_when_not_exists(t *testing.T) {
	userStore := newMockUserStore()

	err := SeedAdmin(t.Context(), userStore, "admin", "password123")
	if err != nil {
		t.Fatalf("SeedAdmin() error = %v", err)
	}

	u, err := userStore.GetByUsername(t.Context(), "admin")
	if err != nil {
		t.Fatalf("GetByUsername() error = %v", err)
	}

	if u.Username != "admin" {
		t.Errorf("Username = %q, want %q", u.Username, "admin")
	}

	if u.PasswordHash == "" {
		t.Error("PasswordHash is empty, want hashed password")
	}

	if u.PasswordHash == "password123" {
		t.Error("PasswordHash equals plain password, want bcrypt hash")
	}

	if u.ForcePasswordChange != false {
		t.Errorf("ForcePasswordChange = %v, want false", u.ForcePasswordChange)
	}
}

func TestSeedAdmin_skips_if_user_exists(t *testing.T) {
	userStore := newMockUserStore()

	// First call creates the user
	err := SeedAdmin(t.Context(), userStore, "admin", "password123")
	if err != nil {
		t.Fatalf("first SeedAdmin() error = %v", err)
	}

	// Get the original user
	original, _ := userStore.GetByUsername(t.Context(), "admin")

	// Second call should skip without error
	err = SeedAdmin(t.Context(), userStore, "admin", "differentpassword")
	if err != nil {
		t.Fatalf("second SeedAdmin() error = %v", err)
	}

	// User should be unchanged
	u, _ := userStore.GetByUsername(t.Context(), "admin")
	if u.ID != original.ID {
		t.Errorf("User ID changed after second seed")
	}
	if u.PasswordHash != original.PasswordHash {
		t.Errorf("PasswordHash changed after second seed")
	}
}

type mockRoleStore struct {
	roles     map[string]*role.Role
	userRoles map[uuid.UUID][]uuid.UUID // user_id -> role_ids
}

func newMockRoleStore() *mockRoleStore {
	return &mockRoleStore{
		roles:     make(map[string]*role.Role),
		userRoles: make(map[uuid.UUID][]uuid.UUID),
	}
}

func (m *mockRoleStore) CreateRole(ctx context.Context, name string) (*role.Role, error) {
	if _, ok := m.roles[name]; ok {
		return nil, errors.New("role already exists")
	}
	r := &role.Role{ID: uuid.New(), Name: name}
	m.roles[name] = r
	return r, nil
}

func (m *mockRoleStore) GetByID(ctx context.Context, id uuid.UUID) (*role.Role, error) {
	for _, r := range m.roles {
		if r.ID == id {
			return r, nil
		}
	}
	return nil, role.ErrNotFound
}

func (m *mockRoleStore) GetRoleByName(ctx context.Context, name string) (*role.Role, error) {
	if r, ok := m.roles[name]; ok {
		return r, nil
	}
	return nil, role.ErrNotFound
}

func (m *mockRoleStore) List(ctx context.Context) ([]role.Role, error) {
	var out []role.Role
	for _, r := range m.roles {
		out = append(out, *r)
	}
	return out, nil
}

func (m *mockRoleStore) Delete(ctx context.Context, id uuid.UUID) error {
	for name, r := range m.roles {
		if r.ID == id {
			delete(m.roles, name)
			return nil
		}
	}
	return role.ErrNotFound
}

func (m *mockRoleStore) AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	return nil
}

func (m *mockRoleStore) RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	return nil
}

func (m *mockRoleStore) AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	m.userRoles[userID] = append(m.userRoles[userID], roleID)
	return nil
}

func (m *mockRoleStore) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]role.Role, error) {
	roleIDs := m.userRoles[userID]
	var roles []role.Role
	for _, rid := range roleIDs {
		for _, r := range m.roles {
			if r.ID == rid {
				roles = append(roles, *r)
			}
		}
	}
	return roles, nil
}

func TestSeedAdmin_assigns_admin_role(t *testing.T) {
	userStore := newMockUserStore()
	roleStore := newMockRoleStore()

	err := SeedAdminWithRole(t.Context(), userStore, roleStore, "admin", "password123")
	if err != nil {
		t.Fatalf("SeedAdminWithRole() error = %v", err)
	}

	// Verify user was created
	u, err := userStore.GetByUsername(t.Context(), "admin")
	if err != nil {
		t.Fatalf("GetByUsername() error = %v", err)
	}

	// Verify admin role was created
	role, err := roleStore.GetRoleByName(t.Context(), "admin")
	if err != nil {
		t.Fatalf("GetRoleByName() error = %v", err)
	}

	// Verify user has admin role
	roles, err := roleStore.GetUserRoles(t.Context(), u.ID)
	if err != nil {
		t.Fatalf("GetUserRoles() error = %v", err)
	}

	if len(roles) != 1 {
		t.Fatalf("user has %d roles, want 1", len(roles))
	}

	if roles[0].ID != role.ID {
		t.Errorf("user role ID = %v, want %v", roles[0].ID, role.ID)
	}
}
