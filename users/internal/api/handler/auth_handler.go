// Package handler provides HTTP handlers for the API.
package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"users/internal/auth"
	"users/internal/role"
	"users/internal/user"

	"github.com/google/uuid"
)

// RoleStoreForAuth optionally provides user roles for inclusion in JWT (e.g. for Admin middleware).
type RoleStoreForAuth interface {
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]role.Role, error)
}

// AuthHandlerConfig holds configuration for the auth handler.
type AuthHandlerConfig struct {
	UserStore       UserStore
	RefreshStore    RefreshStore
	RoleStore       RoleStoreForAuth // optional: used to include role names in access token
	JWTSecret       []byte
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

// UserStore defines the interface for user persistence needed by auth handler.
type UserStore interface {
	GetByUsername(ctx context.Context, username string) (*user.User, error)
}

// RefreshStore defines the interface for refresh token persistence.
type RefreshStore interface {
	Create(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (*auth.RefreshToken, error)
	GetByHash(ctx context.Context, tokenHash string) (*auth.RefreshToken, error)
	Revoke(ctx context.Context, id string) error
}

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	userStore       UserStore
	refreshStore    RefreshStore
	roleStore       RoleStoreForAuth
	jwtSecret       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(cfg AuthHandlerConfig) *AuthHandler {
	return &AuthHandler{
		userStore:       cfg.UserStore,
		refreshStore:    cfg.RefreshStore,
		roleStore:       cfg.RoleStore,
		jwtSecret:       cfg.JWTSecret,
		accessTokenTTL:  cfg.AccessTokenTTL,
		refreshTokenTTL: cfg.RefreshTokenTTL,
	}
}

func (h *AuthHandler) roleNamesForUser(ctx context.Context, userID string) []string {
	if h.roleStore == nil {
		return nil
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil
	}
	roles, err := h.roleStore.GetUserRoles(ctx, uid)
	if err != nil {
		return nil
	}
	names := make([]string, len(roles))
	for i := range roles {
		names[i] = roles[i].Name
	}
	return names
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken         string `json:"access_token"`
	RefreshToken        string `json:"refresh_token"`
	ForcePasswordChange bool   `json:"force_password_change"`
}

// Login handles POST /v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		ctx := r.Context()
		u, err := h.userStore.GetByUsername(ctx, req.Username)
		if err != nil {
			WriteJSONError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		if err := auth.ComparePassword(u.PasswordHash, req.Password); err != nil {
			WriteJSONError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}

		roleNames := h.roleNamesForUser(ctx, u.ID.String())
		accessToken, err := auth.IssueAccessToken(h.jwtSecret, u.ID.String(), roleNames, u.ForcePasswordChange, h.accessTokenTTL)
		if err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to issue token")
			return
		}

		refreshToken, err := auth.GenerateRefreshToken()
		if err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to generate refresh token")
			return
		}
		refreshHash := auth.HashRefreshToken(refreshToken)

		if _, err := h.refreshStore.Create(ctx, u.ID.String(), refreshHash, time.Now().Add(h.refreshTokenTTL)); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to store refresh token")
			return
		}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenResponse{
		AccessToken:         accessToken,
		RefreshToken:        refreshToken,
		ForcePasswordChange: u.ForcePasswordChange,
	})
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// Refresh handles POST /v1/auth/refresh.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	storedToken, err := h.refreshStore.GetByHash(ctx, tokenHash)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	if storedToken.Revoked || time.Now().After(storedToken.ExpiresAt) {
		WriteJSONError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	roleNames := h.roleNamesForUser(ctx, storedToken.UserID)
	accessToken, err := auth.IssueAccessToken(h.jwtSecret, storedToken.UserID, roleNames, false, h.accessTokenTTL)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to issue token")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access_token": accessToken,
	})
}

// logoutRequest is the body for POST /v1/auth/logout.
type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// Logout handles POST /v1/auth/logout. Revokes the given refresh token.
// Idempotent: if token is missing, invalid, or already revoked, returns 200/204 without error.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req logoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if req.RefreshToken == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	ctx := r.Context()
	tokenHash := auth.HashRefreshToken(req.RefreshToken)
	storedToken, err := h.refreshStore.GetByHash(ctx, tokenHash)
	if err != nil || storedToken == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if storedToken.Revoked {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if err := h.refreshStore.Revoke(ctx, storedToken.ID); err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to revoke token")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
