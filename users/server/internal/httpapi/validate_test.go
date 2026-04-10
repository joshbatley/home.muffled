package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"users2/internal/auth"
	"users2/internal/httpapi/middleware"
)

func TestAuthHandler_Validate(t *testing.T) {
	h := &AuthHandler{
		jwtSecret: []byte("test-secret-key-32bytes-long!!"),
	}
	claims := &auth.Claims{
		UserID:              "550e8400-e29b-41d4-a716-446655440000",
		Email:               "a@b.c",
		Roles:               []string{"user"},
		Permissions:         []string{"intranet:read"},
		ForcePasswordChange: false,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}
	req := httptest.NewRequest(http.MethodGet, "/v1/auth/validate", nil)
	req = req.WithContext(middleware.ContextWithClaims(req.Context(), claims))
	rec := httptest.NewRecorder()
	h.Validate(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("code %d", rec.Code)
	}
	var out validateResponse
	if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	if out.Email != "a@b.c" || len(out.Permissions) != 1 {
		t.Fatalf("%+v", out)
	}
}
