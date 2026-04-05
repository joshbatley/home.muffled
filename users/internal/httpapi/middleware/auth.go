package middleware

import (
	"context"
	"net/http"
	"slices"
	"strings"

	"users2/internal/auth"
)

const PermUsersAdmin = "users:admin"

type contextKey string

const claimsKey contextKey = "claims"

func ClaimsFromContext(ctx context.Context) *auth.Claims {
	claims, _ := ctx.Value(claimsKey).(*auth.Claims)
	return claims
}

func ContextWithClaims(ctx context.Context, claims *auth.Claims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}

func Auth(secret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			token, found := strings.CutPrefix(authHeader, "Bearer ")
			if !found {
				http.Error(w, "invalid authorization header", http.StatusUnauthorized)
				return
			}

			claims, err := auth.ValidateAccessToken(secret, token)
			if err != nil {
				http.Error(w, "invalid token", http.StatusUnauthorized)
				return
			}

			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func Admin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if slices.Contains(claims.Roles, "admin") {
			next.ServeHTTP(w, r)
			return
		}
		if slices.Contains(claims.Permissions, PermUsersAdmin) {
			next.ServeHTTP(w, r)
			return
		}

		http.Error(w, "forbidden", http.StatusForbidden)
	})
}

func ForcePasswordChange(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if !claims.ForcePasswordChange {
			next.ServeHTTP(w, r)
			return
		}

		if r.Method == http.MethodPut && strings.HasSuffix(r.URL.Path, "/password") && r.PathValue("id") == claims.UserID {
			next.ServeHTTP(w, r)
			return
		}

		http.Error(w, "password change required", http.StatusForbidden)
	})
}
