package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"users/internal/api/middleware"
	"users/internal/auth"
	"users/internal/role"

	"github.com/google/uuid"
)

type mockRoleStoreForAdmin struct {
	roles           map[string]*role.Role
	rolePerms        map[uuid.UUID]map[uuid.UUID]struct{}
	userRoles        map[uuid.UUID][]uuid.UUID
	createRoleErr    error
	assignPermErr    error
	removeRoleErr    error
}

func newMockRoleStoreForAdmin() *mockRoleStoreForAdmin {
	return &mockRoleStoreForAdmin{
		roles:    make(map[string]*role.Role),
		rolePerms: make(map[uuid.UUID]map[uuid.UUID]struct{}),
		userRoles: make(map[uuid.UUID][]uuid.UUID),
	}
}

func (m *mockRoleStoreForAdmin) CreateRole(ctx context.Context, name string) (*role.Role, error) {
	if m.createRoleErr != nil {
		return nil, m.createRoleErr
	}
	if _, ok := m.roles[name]; ok {
		return nil, role.ErrDuplicateRole
	}
	r := &role.Role{ID: uuid.New(), Name: name}
	m.roles[name] = r
	return r, nil
}

func (m *mockRoleStoreForAdmin) GetByID(ctx context.Context, id uuid.UUID) (*role.Role, error) {
	for _, r := range m.roles {
		if r.ID == id {
			return r, nil
		}
	}
	return nil, role.ErrNotFound
}

func (m *mockRoleStoreForAdmin) List(ctx context.Context) ([]role.Role, error) {
	var out []role.Role
	for _, r := range m.roles {
		out = append(out, *r)
	}
	return out, nil
}

func (m *mockRoleStoreForAdmin) Delete(ctx context.Context, id uuid.UUID) error {
	for name, r := range m.roles {
		if r.ID == id {
			delete(m.roles, name)
			return nil
		}
	}
	return role.ErrNotFound
}

func (m *mockRoleStoreForAdmin) AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	if m.assignPermErr != nil {
		return m.assignPermErr
	}
	if m.rolePerms[roleID] == nil {
		m.rolePerms[roleID] = make(map[uuid.UUID]struct{})
	}
	m.rolePerms[roleID][permissionID] = struct{}{}
	return nil
}

func (m *mockRoleStoreForAdmin) RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	if m.rolePerms[roleID] != nil {
		delete(m.rolePerms[roleID], permissionID)
	}
	return nil
}

func (m *mockRoleStoreForAdmin) AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	m.userRoles[userID] = append(m.userRoles[userID], roleID)
	return nil
}

func (m *mockRoleStoreForAdmin) RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error {
	if m.removeRoleErr != nil {
		return m.removeRoleErr
	}
	ids := m.userRoles[userID]
	for i, id := range ids {
		if id == roleID {
			m.userRoles[userID] = append(ids[:i], ids[i+1:]...)
			return nil
		}
	}
	return role.ErrNotFound
}

type mockPermissionStoreForAdmin struct {
	perms map[string]*role.Permission
}

func newMockPermissionStoreForAdmin() *mockPermissionStoreForAdmin {
	return &mockPermissionStoreForAdmin{perms: make(map[string]*role.Permission)}
}

func (m *mockPermissionStoreForAdmin) Create(ctx context.Context, key, description string) (*role.Permission, error) {
	if _, ok := m.perms[key]; ok {
		return nil, role.ErrDuplicatePermission
	}
	p := &role.Permission{ID: uuid.New(), Key: key, Description: description}
	m.perms[key] = p
	return p, nil
}

func (m *mockPermissionStoreForAdmin) GetByID(ctx context.Context, id uuid.UUID) (*role.Permission, error) {
	for _, p := range m.perms {
		if p.ID == id {
			return p, nil
		}
	}
	return nil, role.PermissionNotFound
}

func (m *mockPermissionStoreForAdmin) List(ctx context.Context) ([]role.Permission, error) {
	var out []role.Permission
	for _, p := range m.perms {
		out = append(out, *p)
	}
	return out, nil
}

func (m *mockPermissionStoreForAdmin) Delete(ctx context.Context, id uuid.UUID) error {
	for key, p := range m.perms {
		if p.ID == id {
			delete(m.perms, key)
			return nil
		}
	}
	return role.PermissionNotFound
}

func adminCtx(req *http.Request) *http.Request {
	return req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: uuid.New().String(), Roles: []string{"admin"}}))
}

func TestCreateRole_AsAdmin_Succeeds(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	permStore := newMockPermissionStoreForAdmin()
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: permStore})

	body, _ := json.Marshal(createRoleRequest{Name: "editor"})
	req := httptest.NewRequest(http.MethodPost, "/v1/roles", bytes.NewReader(body))
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.CreateRole(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp roleResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Name != "editor" {
		t.Errorf("name = %q, want editor", resp.Name)
	}
}

func TestListRoles_AsAdmin_Succeeds(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	roleStore.roles["admin"] = &role.Role{ID: uuid.New(), Name: "admin"}
	roleStore.roles["viewer"] = &role.Role{ID: uuid.New(), Name: "viewer"}
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: newMockPermissionStoreForAdmin()})

	req := httptest.NewRequest(http.MethodGet, "/v1/roles", nil)
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.ListRoles(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp []roleResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp) != 2 {
		t.Errorf("len = %d, want 2", len(resp))
	}
}

func TestDeleteRole_AsAdmin_Succeeds(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	r := &role.Role{ID: uuid.New(), Name: "temp"}
	roleStore.roles["temp"] = r
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: newMockPermissionStoreForAdmin()})

	req := httptest.NewRequest(http.MethodDelete, "/v1/roles/"+r.ID.String(), nil)
	req.SetPathValue("id", r.ID.String())
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.DeleteRole(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}

func TestAssignPermissionToRole_AsAdmin_Succeeds(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	permStore := newMockPermissionStoreForAdmin()
	r, _ := roleStore.CreateRole(context.Background(), "admin")
	p, _ := permStore.Create(context.Background(), "read", "")
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: permStore})

	body, _ := json.Marshal(assignPermissionsRequest{PermissionIDs: []string{p.ID.String()}})
	req := httptest.NewRequest(http.MethodPost, "/v1/roles/"+r.ID.String()+"/permissions", bytes.NewReader(body))
	req.SetPathValue("id", r.ID.String())
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.AssignPermissionsToRole(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}

func TestRemovePermissionFromRole_AsAdmin_Succeeds(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	permStore := newMockPermissionStoreForAdmin()
	r, _ := roleStore.CreateRole(context.Background(), "admin")
	p, _ := permStore.Create(context.Background(), "read", "")
	roleStore.AssignPermission(context.Background(), r.ID, p.ID)
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: permStore})

	req := httptest.NewRequest(http.MethodDelete, "/v1/roles/"+r.ID.String()+"/permissions/"+p.ID.String(), nil)
	req.SetPathValue("id", r.ID.String())
	req.SetPathValue("permId", p.ID.String())
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.RemovePermissionFromRole(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}

func TestCreatePermission_AsAdmin_Succeeds(t *testing.T) {
	permStore := newMockPermissionStoreForAdmin()
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: newMockRoleStoreForAdmin(), PermissionStore: permStore})

	body, _ := json.Marshal(createPermissionRequest{Key: "users:write", Description: "Write users"})
	req := httptest.NewRequest(http.MethodPost, "/v1/permissions", bytes.NewReader(body))
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.CreatePermission(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}
	var resp permissionResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Key != "users:write" {
		t.Errorf("key = %q, want users:write", resp.Key)
	}
}

func TestListPermissions_AsAdmin_Succeeds(t *testing.T) {
	permStore := newMockPermissionStoreForAdmin()
	permStore.Create(context.Background(), "a", "")
	permStore.Create(context.Background(), "b", "")
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: newMockRoleStoreForAdmin(), PermissionStore: permStore})

	req := httptest.NewRequest(http.MethodGet, "/v1/permissions", nil)
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.ListPermissions(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp []permissionResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(resp) != 2 {
		t.Errorf("len = %d, want 2", len(resp))
	}
}

func TestDeletePermission_AsAdmin_Succeeds(t *testing.T) {
	permStore := newMockPermissionStoreForAdmin()
	p, _ := permStore.Create(context.Background(), "x", "")
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: newMockRoleStoreForAdmin(), PermissionStore: permStore})

	req := httptest.NewRequest(http.MethodDelete, "/v1/permissions/"+p.ID.String(), nil)
	req.SetPathValue("id", p.ID.String())
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.DeletePermission(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}

func TestAssignRoleToUser_AsAdmin_Succeeds(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	r, _ := roleStore.CreateRole(context.Background(), "viewer")
	userID := uuid.New()
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: newMockPermissionStoreForAdmin()})

	body, _ := json.Marshal(assignRolesToUserRequest{RoleIDs: []string{r.ID.String()}})
	req := httptest.NewRequest(http.MethodPost, "/v1/users/"+userID.String()+"/roles", bytes.NewReader(body))
	req.SetPathValue("id", userID.String())
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.AssignRolesToUser(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}

func TestRemoveRoleFromUser_AsAdmin_Succeeds(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	r, _ := roleStore.CreateRole(context.Background(), "viewer")
	userID := uuid.New()
	roleStore.AssignRoleToUser(context.Background(), userID, r.ID)
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: newMockPermissionStoreForAdmin()})

	req := httptest.NewRequest(http.MethodDelete, "/v1/users/"+userID.String()+"/roles/"+r.ID.String(), nil)
	req.SetPathValue("id", userID.String())
	req.SetPathValue("roleId", r.ID.String())
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.RemoveRoleFromUser(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", rec.Code)
	}
}

func TestAdmin_NonAdmin_CannotAccess(t *testing.T) {
	h := NewAdminHandler(AdminHandlerConfig{
		RoleStore:       newMockRoleStoreForAdmin(),
		PermissionStore: newMockPermissionStoreForAdmin(),
	})
	handler := middleware.Admin(http.HandlerFunc(h.ListRoles))

	req := httptest.NewRequest(http.MethodGet, "/v1/roles", nil)
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: uuid.New().String(), Roles: []string{"viewer"}}))
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rec.Code)
	}
}

func TestCreateRole_DuplicateName_Returns409(t *testing.T) {
	roleStore := newMockRoleStoreForAdmin()
	roleStore.roles["editor"] = &role.Role{ID: uuid.New(), Name: "editor"}
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: roleStore, PermissionStore: newMockPermissionStoreForAdmin()})

	body, _ := json.Marshal(createRoleRequest{Name: "editor"})
	req := httptest.NewRequest(http.MethodPost, "/v1/roles", bytes.NewReader(body))
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.CreateRole(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestCreatePermission_DuplicateKey_Returns409(t *testing.T) {
	permStore := newMockPermissionStoreForAdmin()
	permStore.perms["users:read"] = &role.Permission{ID: uuid.New(), Key: "users:read"}
	h := NewAdminHandler(AdminHandlerConfig{RoleStore: newMockRoleStoreForAdmin(), PermissionStore: permStore})

	body, _ := json.Marshal(createPermissionRequest{Key: "users:read", Description: "Read"})
	req := httptest.NewRequest(http.MethodPost, "/v1/permissions", bytes.NewReader(body))
	req = adminCtx(req)
	rec := httptest.NewRecorder()

	h.CreatePermission(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", rec.Code, rec.Body.String())
	}
}
