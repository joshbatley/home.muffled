package httpapi

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"users2/internal/auth"
	"users2/internal/httpapi/middleware"
	"users2/internal/role"
	"users2/internal/user"

	"github.com/google/uuid"
)

type RoleReader interface {
	GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]role.Role, error)
	GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]role.Permission, error)
}

type AuthHandlerConfig struct {
	UserStore       user.Store
	RefreshStore    auth.RefreshTokenStore
	RoleStore       RoleReader
	JWTSecret       []byte
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
}

type AuthHandler struct {
	userStore       user.Store
	refreshStore    auth.RefreshTokenStore
	roleStore       RoleReader
	jwtSecret       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

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

func (h *AuthHandler) issueTokens(ctx context.Context, u *user.User) (access, refresh string, err error) {
	var roles []role.Role
	var perms []role.Permission
	if h.roleStore != nil {
		roles, err = h.roleStore.GetRolesByUserID(ctx, u.ID)
		if err != nil {
			return "", "", fmt.Errorf("fetching roles: %w", err)
		}
		perms, err = h.roleStore.GetPermissionsByUserID(ctx, u.ID)
		if err != nil {
			return "", "", fmt.Errorf("fetching permissions: %w", err)
		}
	}
	roleNames := role.RoleNames(roles)
	permKeys := role.PermissionKeys(perms)

	access, err = auth.IssueAccessToken(h.jwtSecret, u.ID.String(), u.Email, roleNames, permKeys, u.ForcePasswordChange, h.accessTokenTTL)
	if err != nil {
		return "", "", err
	}
	rawRefresh, err := auth.GenerateRefreshToken()
	if err != nil {
		return "", "", err
	}
	hash := auth.HashRefreshToken(rawRefresh)
	expires := time.Now().Add(h.refreshTokenTTL)
	if _, err := h.refreshStore.Create(ctx, u.ID.String(), hash, expires); err != nil {
		return "", "", err
	}
	return access, rawRefresh, nil
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken         string `json:"access_token"`
	RefreshToken        string `json:"refresh_token"`
	ForcePasswordChange bool   `json:"force_password_change"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := r.Context()
	u, err := h.userStore.GetByEmail(ctx, req.Email)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err := auth.ComparePassword(u.PasswordHash, req.Password); err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	access, refresh, err := h.issueTokens(ctx, u)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to issue token")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tokenResponse{
		AccessToken:         access,
		RefreshToken:        refresh,
		ForcePasswordChange: u.ForcePasswordChange,
	})
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	hash := auth.HashRefreshToken(req.RefreshToken)
	ctx := r.Context()
	rt, err := h.refreshStore.GetByHash(ctx, hash)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}
	if rt.Revoked || time.Now().After(rt.ExpiresAt) {
		WriteJSONError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	uid, err := uuid.Parse(rt.UserID)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}
	u, err := h.userStore.GetByID(ctx, uid)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	_ = h.refreshStore.Revoke(ctx, rt.ID)
	access, newRefresh, err := h.issueTokens(ctx, u)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to issue token")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tokenResponse{
		AccessToken:         access,
		RefreshToken:        newRefresh,
		ForcePasswordChange: u.ForcePasswordChange,
	})
}

type logoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req logoutRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.RefreshToken == "" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	hash := auth.HashRefreshToken(req.RefreshToken)
	ctx := r.Context()
	rt, err := h.refreshStore.GetByHash(ctx, hash)
	if err == nil && rt != nil {
		_ = h.refreshStore.Revoke(ctx, rt.ID)
	}
	w.WriteHeader(http.StatusNoContent)
}

type validateResponse struct {
	UserID              string   `json:"user_id"`
	Email               string   `json:"email"`
	Roles               []string `json:"roles"`
	Permissions         []string `json:"permissions"`
	ForcePasswordChange bool     `json:"force_password_change"`
	ExpiresAt           int64    `json:"exp"`
}

func (h *AuthHandler) Validate(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		WriteJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	exp := int64(0)
	if claims.ExpiresAt != nil {
		exp = claims.ExpiresAt.Unix()
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(validateResponse{
		UserID:              claims.UserID,
		Email:               claims.Email,
		Roles:               claims.Roles,
		Permissions:         claims.Permissions,
		ForcePasswordChange: claims.ForcePasswordChange,
		ExpiresAt:           exp,
	})
}
