package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"users/internal/auth"
)

func TestAuthMiddleware_valid_token_succeeds(t *testing.T) {
	secret := []byte("test-secret")
	token, err := auth.IssueAccessToken(secret, "user-123", []string{"viewer"}, false, 15*time.Minute)
	if err != nil {
		t.Fatalf("failed to issue token: %v", err)
	}

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil {
			t.Error("expected claims in context, got nil")
			return
		}
		if claims.UserID != "user-123" {
			t.Errorf("expected user ID %q, got %q", "user-123", claims.UserID)
		}
		w.WriteHeader(http.StatusOK)
	})

	middleware := Auth(secret)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}

func TestAuthMiddleware_missing_token_returns_401(t *testing.T) {
	secret := []byte("test-secret")

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	middleware := Auth(secret)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	rec := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestAuthMiddleware_invalid_token_returns_401(t *testing.T) {
	secret := []byte("test-secret")

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	middleware := Auth(secret)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rec := httptest.NewRecorder()

	middleware(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, rec.Code)
	}
}

func TestAdminMiddleware_admin_role_succeeds(t *testing.T) {
	claims := &auth.Claims{
		UserID: "user-123",
		Roles:  []string{"admin"},
	}
	ctx := context.WithValue(t.Context(), claimsKey, claims)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	Admin(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}

func TestAdminMiddleware_non_admin_role_returns_403(t *testing.T) {
	claims := &auth.Claims{
		UserID: "user-123",
		Roles:  []string{"viewer"},
	}
	ctx := context.WithValue(t.Context(), claimsKey, claims)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	Admin(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, rec.Code)
	}
}

func TestForcePasswordChangeMiddleware_blocks_when_flag_true(t *testing.T) {
	claims := &auth.Claims{
		UserID:              "user-123",
		Roles:               []string{"viewer"},
		ForcePasswordChange: true,
	}
	ctx := context.WithValue(t.Context(), claimsKey, claims)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	})

	req := httptest.NewRequest(http.MethodGet, "/v1/users", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	ForcePasswordChange(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Errorf("expected status %d, got %d", http.StatusForbidden, rec.Code)
	}
}

func TestForcePasswordChangeMiddleware_allows_password_change_route(t *testing.T) {
	claims := &auth.Claims{
		UserID:              "user-123",
		Roles:               []string{"viewer"},
		ForcePasswordChange: true,
	}
	ctx := context.WithValue(t.Context(), claimsKey, claims)

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodPut, "/v1/users/user-123/password", nil).WithContext(ctx)
	rec := httptest.NewRecorder()

	ForcePasswordChange(handler).ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rec.Code)
	}
}
