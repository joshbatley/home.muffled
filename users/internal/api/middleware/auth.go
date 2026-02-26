package middleware

import (
	"context"
	"net/http"
	"strings"

	"users/internal/auth"
)

type contextKey string

const claimsKey contextKey = "claims"

// ClaimsFromContext retrieves the auth claims from the request context.
func ClaimsFromContext(ctx context.Context) *auth.Claims {
	claims, _ := ctx.Value(claimsKey).(*auth.Claims)
	return claims
}

// ContextWithClaims returns a new context with the given claims (for testing).
func ContextWithClaims(ctx context.Context, claims *auth.Claims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}

// Auth returns middleware that validates JWT tokens and adds claims to context.
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

// Admin returns middleware that checks if the user has the admin role.
func Admin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		for _, role := range claims.Roles {
			if role == "admin" {
				next.ServeHTTP(w, r)
				return
			}
		}

		http.Error(w, "forbidden", http.StatusForbidden)
	})
}

// ForcePasswordChange returns middleware that blocks all routes except password change when flag is true.
func ForcePasswordChange(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := ClaimsFromContext(r.Context())
		if claims == nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		if claims.ForcePasswordChange {
			// Allow password change route
			if r.Method == http.MethodPut && strings.HasSuffix(r.URL.Path, "/password") {
				next.ServeHTTP(w, r)
				return
			}
			http.Error(w, "password change required", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, r)
	})
}
