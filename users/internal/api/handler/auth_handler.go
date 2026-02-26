// Package handler provides HTTP handlers for the API.
package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"users/internal/auth"
	"users/internal/user"
)

// AuthHandlerConfig holds configuration for the auth handler.
type AuthHandlerConfig struct {
	UserStore       UserStore
	RefreshStore    RefreshStore
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
}

// AuthHandler handles authentication endpoints.
type AuthHandler struct {
	userStore       UserStore
	refreshStore    RefreshStore
	jwtSecret       []byte
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(cfg AuthHandlerConfig) *AuthHandler {
	return &AuthHandler{
		userStore:       cfg.UserStore,
		refreshStore:    cfg.RefreshStore,
		jwtSecret:       cfg.JWTSecret,
		accessTokenTTL:  cfg.AccessTokenTTL,
		refreshTokenTTL: cfg.RefreshTokenTTL,
	}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// Login handles POST /v1/auth/login.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	u, err := h.userStore.GetByUsername(ctx, req.Username)
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := auth.ComparePassword(u.PasswordHash, req.Password); err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	accessToken, err := auth.IssueAccessToken(h.jwtSecret, u.ID.String(), nil, u.ForcePasswordChange, h.accessTokenTTL)
	if err != nil {
		http.Error(w, "failed to issue token", http.StatusInternalServerError)
		return
	}

	refreshToken, err := auth.GenerateRefreshToken()
	if err != nil {
		http.Error(w, "failed to generate refresh token", http.StatusInternalServerError)
		return
	}
	refreshHash := auth.HashRefreshToken(refreshToken)

	if _, err := h.refreshStore.Create(ctx, u.ID.String(), refreshHash, time.Now().Add(h.refreshTokenTTL)); err != nil {
		http.Error(w, "failed to store refresh token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	})
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// Refresh handles POST /v1/auth/refresh.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tokenHash := auth.HashRefreshToken(req.RefreshToken)

	storedToken, err := h.refreshStore.GetByHash(ctx, tokenHash)
	if err != nil {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}

	if storedToken.Revoked || time.Now().After(storedToken.ExpiresAt) {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}

	accessToken, err := auth.IssueAccessToken(h.jwtSecret, storedToken.UserID, nil, false, h.accessTokenTTL)
	if err != nil {
		http.Error(w, "failed to issue token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access_token": accessToken,
	})
}
