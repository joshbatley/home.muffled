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

type mockUserRoleStoreForAuthz struct {
	rolesByUser       map[uuid.UUID][]role.Role
	permissionsByUser map[uuid.UUID][]role.Permission
}

func newMockUserRoleStoreForAuthz() *mockUserRoleStoreForAuthz {
	return &mockUserRoleStoreForAuthz{
		rolesByUser:       make(map[uuid.UUID][]role.Role),
		permissionsByUser: make(map[uuid.UUID][]role.Permission),
	}
}

func (m *mockUserRoleStoreForAuthz) GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]role.Role, error) {
	return m.rolesByUser[userID], nil
}

func (m *mockUserRoleStoreForAuthz) GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]role.Permission, error) {
	return m.permissionsByUser[userID], nil
}

func (m *mockUserRoleStoreForAuthz) AssignRole(ctx context.Context, userID, roleID uuid.UUID) error { return nil }
func (m *mockUserRoleStoreForAuthz) RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error   { return nil }

func TestAuthzCheck_Admin_AlwaysAllowed(t *testing.T) {
	store := newMockUserRoleStoreForAuthz()
	userID := uuid.New()
	store.rolesByUser[userID] = []role.Role{{ID: uuid.New(), Name: "admin"}}
	h := NewAuthzHandler(AuthzHandlerConfig{UserRoleStore: store})

	body, _ := json.Marshal(authzCheckRequest{Permission: "any:permission"})
	req := httptest.NewRequest(http.MethodPost, "/v1/authz/check", bytes.NewReader(body))
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String()}))
	rec := httptest.NewRecorder()

	h.Check(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp authzCheckResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !resp.Allowed {
		t.Error("expected allowed true for admin")
	}
	if resp.Reason != "admin" {
		t.Errorf("reason = %q, want admin", resp.Reason)
	}
}

func TestAuthzCheck_UserWithPermission_Allowed(t *testing.T) {
	store := newMockUserRoleStoreForAuthz()
	userID := uuid.New()
	store.permissionsByUser[userID] = []role.Permission{
		{ID: uuid.New(), Key: "users:read"},
	}
	h := NewAuthzHandler(AuthzHandlerConfig{UserRoleStore: store})

	body, _ := json.Marshal(authzCheckRequest{Permission: "users:read"})
	req := httptest.NewRequest(http.MethodPost, "/v1/authz/check", bytes.NewReader(body))
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String()}))
	rec := httptest.NewRecorder()

	h.Check(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp authzCheckResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !resp.Allowed {
		t.Error("expected allowed true when user has permission")
	}
}

func TestAuthzCheck_UserWithoutPermission_Denied(t *testing.T) {
	store := newMockUserRoleStoreForAuthz()
	userID := uuid.New()
	store.permissionsByUser[userID] = []role.Permission{
		{ID: uuid.New(), Key: "users:read"},
	}
	h := NewAuthzHandler(AuthzHandlerConfig{UserRoleStore: store})

	body, _ := json.Marshal(authzCheckRequest{Permission: "users:write"})
	req := httptest.NewRequest(http.MethodPost, "/v1/authz/check", bytes.NewReader(body))
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String()}))
	rec := httptest.NewRecorder()

	h.Check(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp authzCheckResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Allowed {
		t.Error("expected allowed false when user lacks permission")
	}
}

func TestAuthzCheck_InvalidPermissionKey_ReturnsDenied(t *testing.T) {
	store := newMockUserRoleStoreForAuthz()
	userID := uuid.New()
	h := NewAuthzHandler(AuthzHandlerConfig{UserRoleStore: store})

	body, _ := json.Marshal(authzCheckRequest{Permission: ""})
	req := httptest.NewRequest(http.MethodPost, "/v1/authz/check", bytes.NewReader(body))
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), &auth.Claims{UserID: userID.String()}))
	rec := httptest.NewRecorder()

	h.Check(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	var resp authzCheckResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Allowed {
		t.Error("expected allowed false for empty permission key")
	}
}

func TestAuthzCheck_Unauthenticated_Returns401(t *testing.T) {
	store := newMockUserRoleStoreForAuthz()
	h := NewAuthzHandler(AuthzHandlerConfig{UserRoleStore: store})

	body, _ := json.Marshal(authzCheckRequest{Permission: "users:read"})
	req := httptest.NewRequest(http.MethodPost, "/v1/authz/check", bytes.NewReader(body))
	// No claims in context
	rec := httptest.NewRecorder()

	h.Check(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}
