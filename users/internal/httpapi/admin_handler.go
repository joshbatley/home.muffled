package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"users2/internal/role"

	"github.com/google/uuid"
)

type RoleStoreAdmin interface {
	CreateRole(ctx context.Context, name string) (*role.Role, error)
	GetByID(ctx context.Context, id uuid.UUID) (*role.Role, error)
	List(ctx context.Context) ([]role.Role, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
	RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error
	GrantPermissionToUser(ctx context.Context, userID, permissionID uuid.UUID) error
	RevokePermissionFromUser(ctx context.Context, userID, permissionID uuid.UUID) error
}

type PermissionStoreAdmin interface {
	Create(ctx context.Context, key, description string) (*role.Permission, error)
	GetByID(ctx context.Context, id uuid.UUID) (*role.Permission, error)
	List(ctx context.Context) ([]role.Permission, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type AdminHandlerConfig struct {
	RoleStore       RoleStoreAdmin
	PermissionStore PermissionStoreAdmin
}

type AdminHandler struct {
	roleStore       RoleStoreAdmin
	permissionStore PermissionStoreAdmin
}

func NewAdminHandler(cfg AdminHandlerConfig) *AdminHandler {
	return &AdminHandler{roleStore: cfg.RoleStore, permissionStore: cfg.PermissionStore}
}

type roleResponse struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type createRoleRequest struct {
	Name string `json:"name"`
}

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
	_ = json.NewEncoder(w).Encode(roleResponse{ID: created.ID.String(), Name: created.Name})
}

func (h *AdminHandler) ListRoles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	roles, err := h.roleStore.List(ctx)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to list roles")
		return
	}
	out := make([]roleResponse, len(roles))
	for i, ro := range roles {
		out[i] = roleResponse{ID: ro.ID.String(), Name: ro.Name}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func (h *AdminHandler) DeleteRole(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid role id")
		return
	}
	if err := h.roleStore.Delete(r.Context(), id); err != nil {
		if errors.Is(err, role.ErrNotFound) {
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

func (h *AdminHandler) AssignPermissionsToRole(w http.ResponseWriter, r *http.Request) {
	roleID, err := uuid.Parse(r.PathValue("id"))
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
		pid, err := uuid.Parse(pidStr)
		if err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid permission id")
			return
		}
		if err := h.roleStore.AssignPermission(ctx, roleID, pid); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to assign permission")
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) RemovePermissionFromRole(w http.ResponseWriter, r *http.Request) {
	roleID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid role id")
		return
	}
	permID, err := uuid.Parse(r.PathValue("permId"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid permission id")
		return
	}
	if err := h.roleStore.RemovePermission(r.Context(), roleID, permID); err != nil {
		if errors.Is(err, role.ErrNotFound) {
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
	_ = json.NewEncoder(w).Encode(permissionResponse{
		ID: created.ID.String(), Key: created.Key, Description: created.Description,
	})
}

func (h *AdminHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	perms, err := h.permissionStore.List(ctx)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to list permissions")
		return
	}
	out := make([]permissionResponse, len(perms))
	for i, p := range perms {
		out[i] = permissionResponse{ID: p.ID.String(), Key: p.Key, Description: p.Description}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func (h *AdminHandler) DeletePermission(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid permission id")
		return
	}
	if err := h.permissionStore.Delete(r.Context(), id); err != nil {
		if errors.Is(err, role.ErrPermissionNotFound) {
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

func (h *AdminHandler) AssignRolesToUser(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(r.PathValue("id"))
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
		rid, err := uuid.Parse(ridStr)
		if err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid role id")
			return
		}
		if err := h.roleStore.AssignRoleToUser(ctx, userID, rid); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to assign role")
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) RemoveRoleFromUser(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	roleID, err := uuid.Parse(r.PathValue("roleId"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid role id")
		return
	}
	if err := h.roleStore.RemoveRole(r.Context(), userID, roleID); err != nil {
		if errors.Is(err, role.ErrNotFound) {
			WriteJSONError(w, http.StatusNotFound, "not found")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to remove role")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) GrantPermissionsToUser(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var req assignPermissionsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := r.Context()
	for _, pidStr := range req.PermissionIDs {
		pid, err := uuid.Parse(pidStr)
		if err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid permission id")
			return
		}
		if err := h.roleStore.GrantPermissionToUser(ctx, userID, pid); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to grant permission")
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *AdminHandler) RevokePermissionFromUser(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	permID, err := uuid.Parse(r.PathValue("permId"))
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid permission id")
		return
	}
	if err := h.roleStore.RevokePermissionFromUser(r.Context(), userID, permID); err != nil {
		if errors.Is(err, role.ErrNotFound) {
			WriteJSONError(w, http.StatusNotFound, "not found")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to revoke permission")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
