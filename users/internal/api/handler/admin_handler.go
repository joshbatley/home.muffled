package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"users/internal/role"

	"github.com/google/uuid"
)

// RoleStoreForAdmin defines the interface for role persistence needed by admin handler.
type RoleStoreForAdmin interface {
	CreateRole(ctx context.Context, name string) (*role.Role, error)
	GetByID(ctx context.Context, id uuid.UUID) (*role.Role, error)
	List(ctx context.Context) ([]role.Role, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
	RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error
}

// PermissionStoreForAdmin defines the interface for permission persistence.
type PermissionStoreForAdmin interface {
	Create(ctx context.Context, key, description string) (*role.Permission, error)
	GetByID(ctx context.Context, id uuid.UUID) (*role.Permission, error)
	List(ctx context.Context) ([]role.Permission, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// AdminHandlerConfig holds configuration for the admin handler.
type AdminHandlerConfig struct {
	RoleStore       RoleStoreForAdmin
	PermissionStore PermissionStoreForAdmin
}

// AdminHandler handles admin-only endpoints for roles, permissions, and assignments.
type AdminHandler struct {
	roleStore       RoleStoreForAdmin
	permissionStore PermissionStoreForAdmin
}

// NewAdminHandler creates a new AdminHandler.
func NewAdminHandler(cfg AdminHandlerConfig) *AdminHandler {
	return &AdminHandler{
		roleStore:       cfg.RoleStore,
		permissionStore: cfg.PermissionStore,
	}
}

type roleResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type createRoleRequest struct {
	Name string `json:"name"`
}

// CreateRole handles POST /v1/roles.
func (h *AdminHandler) CreateRole(w http.ResponseWriter, r *http.Request) {
	var req createRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		WriteJSONError(w, http.StatusBadRequest, "name required")
		return
	}

	ctx := r.Context()
	created, err := h.roleStore.CreateRole(ctx, req.Name)
	if err != nil {
		if errors.Is(err, role.ErrDuplicateRole) {
			WriteJSONError(w, http.StatusConflict, "role already exists")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to create role")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(roleResponse{ID: created.ID.String(), Name: created.Name})
}

// ListRoles handles GET /v1/roles.
func (h *AdminHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	roles, err := h.roleStore.List(ctx)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to list roles")
		return
	}

	resp := make([]roleResponse, len(roles))
	for i, ro := range roles {
		resp[i] = roleResponse{ID: ro.ID.String(), Name: ro.Name}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// DeleteRole handles DELETE /v1/roles/{id}.
func (h *AdminHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid role id")
		return
	}

	ctx := r.Context()
	if err := h.roleStore.Delete(ctx, id); err != nil {
		if err == role.ErrNotFound {
			WriteJSONError(w, http.StatusNotFound, "role not found")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to delete role")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type assignPermissionsRequest struct {
	PermissionIDs []string `json:"permission_ids"`
}

// AssignPermissionsToRole handles POST /v1/roles/{id}/permissions.
func (h *AdminHandler) AssignPermissionsToRole(w http.ResponseWriter, r *http.Request) {
	roleIDStr := r.PathValue("id")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid role id")
		return
	}

	var req assignPermissionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	for _, pidStr := range req.PermissionIDs {
		permID, err := uuid.Parse(pidStr)
		if err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid permission id: "+pidStr)
			return
		}
		if err := h.roleStore.AssignPermission(ctx, roleID, permID); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to assign permission")
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// RemovePermissionFromRole handles DELETE /v1/roles/{id}/permissions/{permId}.
func (h *AdminHandler) RemovePermissionFromRole(w http.ResponseWriter, r *http.Request) {
	roleIDStr := r.PathValue("id")
	permIDStr := r.PathValue("permId")
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid role id")
		return
	}
	permID, err := uuid.Parse(permIDStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid permission id")
		return
	}

	ctx := r.Context()
	if err := h.roleStore.RemovePermission(ctx, roleID, permID); err != nil {
		if err == role.ErrNotFound {
			WriteJSONError(w, http.StatusNotFound, "not found")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to remove permission")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type permissionResponse struct {
	ID          string `json:"id"`
	Key         string `json:"key"`
	Description string `json:"description"`
}

type createPermissionRequest struct {
	Key         string `json:"key"`
	Description string `json:"description"`
}

// CreatePermission handles POST /v1/permissions.
func (h *AdminHandler) CreatePermission(w http.ResponseWriter, r *http.Request) {
	var req createPermissionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Key == "" {
		WriteJSONError(w, http.StatusBadRequest, "key required")
		return
	}

	ctx := r.Context()
	created, err := h.permissionStore.Create(ctx, req.Key, req.Description)
	if err != nil {
		if errors.Is(err, role.ErrDuplicatePermission) {
			WriteJSONError(w, http.StatusConflict, "permission key already exists")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to create permission")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(permissionResponse{
		ID:          created.ID.String(),
		Key:         created.Key,
		Description: created.Description,
	})
}

// ListPermissions handles GET /v1/permissions.
func (h *AdminHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	perms, err := h.permissionStore.List(ctx)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to list permissions")
		return
	}

	resp := make([]permissionResponse, len(perms))
	for i, p := range perms {
		resp[i] = permissionResponse{ID: p.ID.String(), Key: p.Key, Description: p.Description}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// DeletePermission handles DELETE /v1/permissions/{id}.
func (h *AdminHandler) DeletePermission(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid permission id")
		return
	}

	ctx := r.Context()
	if err := h.permissionStore.Delete(ctx, id); err != nil {
		if err == role.PermissionNotFound {
			WriteJSONError(w, http.StatusNotFound, "permission not found")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to delete permission")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type assignRolesToUserRequest struct {
	RoleIDs []string `json:"role_ids"`
}

// AssignRolesToUser handles POST /v1/users/{id}/roles.
func (h *AdminHandler) AssignRolesToUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.PathValue("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var req assignRolesToUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	ctx := r.Context()
	for _, ridStr := range req.RoleIDs {
		roleID, err := uuid.Parse(ridStr)
		if err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid role id: "+ridStr)
			return
		}
		if err := h.roleStore.AssignRoleToUser(ctx, userID, roleID); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to assign role")
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// RemoveRoleFromUser handles DELETE /v1/users/{id}/roles/{roleId}.
func (h *AdminHandler) RemoveRoleFromUser(w http.ResponseWriter, r *http.Request) {
	userIDStr := r.PathValue("id")
	roleIDStr := r.PathValue("roleId")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	roleID, err := uuid.Parse(roleIDStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid role id")
		return
	}

	ctx := r.Context()
	if err := h.roleStore.RemoveRole(ctx, userID, roleID); err != nil {
		if err == role.ErrNotFound {
			WriteJSONError(w, http.StatusNotFound, "not found")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to remove role")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
