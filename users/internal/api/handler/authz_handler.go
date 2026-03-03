package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"

	"users/internal/api/middleware"
	"users/internal/role"

	"github.com/google/uuid"
)

// UserRoleStoreForAuthz defines the interface for resolving user roles and permissions.
type UserRoleStoreForAuthz interface {
	GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]role.Role, error)
	GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]role.Permission, error)
}

// AuthzHandlerConfig holds configuration for the authz handler.
type AuthzHandlerConfig struct {
	UserRoleStore UserRoleStoreForAuthz
}

// AuthzHandler handles the authorization check endpoint.
type AuthzHandler struct {
	userRoleStore UserRoleStoreForAuthz
}

// NewAuthzHandler creates a new AuthzHandler.
func NewAuthzHandler(cfg AuthzHandlerConfig) *AuthzHandler {
	return &AuthzHandler{userRoleStore: cfg.UserRoleStore}
}

type authzCheckRequest struct {
	Permission string `json:"permission"`
}

type authzCheckResponse struct {
	Allowed bool   `json:"allowed"`
	Reason  string `json:"reason,omitempty"`
}

// Check handles POST /v1/authz/check.
func (h *AuthzHandler) Check(w http.ResponseWriter, r *http.Request) {
	claims := middleware.ClaimsFromContext(r.Context())
	if claims == nil {
		WriteJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req authzCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Permission == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(authzCheckResponse{Allowed: false, Reason: "permission key required"})
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid user in token")
		return
	}

	ctx := r.Context()
	roles, err := h.userRoleStore.GetRolesByUserID(ctx, userID)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to resolve roles")
		return
	}

	// Admin role always allows
	for _, ro := range roles {
		if ro.Name == "admin" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(authzCheckResponse{Allowed: true, Reason: "admin"})
			return
		}
	}

	perms, err := h.userRoleStore.GetPermissionsByUserID(ctx, userID)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to resolve permissions")
		return
	}

	allowed := slices.ContainsFunc(perms, func(p role.Permission) bool { return p.Key == req.Permission })
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(authzCheckResponse{Allowed: allowed})
}
