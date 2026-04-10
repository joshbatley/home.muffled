package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"users2/internal/auth"
)

func TestAdmin_AllowsAdminRole(t *testing.T) {
	claims := &auth.Claims{Roles: []string{"admin"}}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(ContextWithClaims(req.Context(), claims))
	rec := httptest.NewRecorder()
	called := false
	Admin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	})).ServeHTTP(rec, req)
	if rec.Code != http.StatusOK || !called {
		t.Fatalf("code=%d called=%v", rec.Code, called)
	}
}

func TestAdmin_AllowsUsersAdminPermission(t *testing.T) {
	claims := &auth.Claims{Permissions: []string{PermUsersAdmin}}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(ContextWithClaims(req.Context(), claims))
	rec := httptest.NewRecorder()
	Admin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestAdmin_Forbidden(t *testing.T) {
	claims := &auth.Claims{Roles: []string{"user"}}
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req = req.WithContext(ContextWithClaims(req.Context(), claims))
	rec := httptest.NewRecorder()
	Admin(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestForcePasswordChange_BypassChangePassword(t *testing.T) {
	claims := &auth.Claims{UserID: "u1", ForcePasswordChange: true}
	req := httptest.NewRequest(http.MethodPut, "/v1/users/u1/password", nil)
	req.SetPathValue("id", "u1")
	req = req.WithContext(ContextWithClaims(req.Context(), claims))
	rec := httptest.NewRecorder()
	ForcePasswordChange(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})).ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("code=%d", rec.Code)
	}
}

func TestForcePasswordChange_BlocksOther(t *testing.T) {
	claims := &auth.Claims{UserID: "u1", ForcePasswordChange: true}
	req := httptest.NewRequest(http.MethodGet, "/v1/me", nil)
	req = req.WithContext(ContextWithClaims(req.Context(), claims))
	rec := httptest.NewRecorder()
	ForcePasswordChange(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {})).ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Fatalf("code=%d", rec.Code)
	}
}
