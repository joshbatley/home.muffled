package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"

	"users/internal/api/middleware"
	"users/internal/auth"
	"users/internal/role"
	"users/internal/user"

	"github.com/google/uuid"
)

// UserStoreForUsers defines the interface for user persistence needed by user handler.
type UserStoreForUsers interface {
	List(ctx context.Context) ([]user.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*user.User, error)
	Create(ctx context.Context, u *user.User) error
	Update(ctx context.Context, u *user.User) error
}

// UserRoleStoreForMe optionally provides roles and permissions for the current user (Me response).
type UserRoleStoreForMe interface {
	GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]role.Role, error)
	GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]role.Permission, error)
}

// UserHandlerConfig holds configuration for the user handler.
type UserHandlerConfig struct {
	UserStore         UserStoreForUsers
	UserRoleStoreForMe UserRoleStoreForMe // optional: enriches GET /v1/me with roles, permissions
}

// UserHandler handles user endpoints.
type UserHandler struct {
	userStore         UserStoreForUsers
	userRoleStoreForMe UserRoleStoreForMe
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(cfg UserHandlerConfig) *UserHandler {
	return &UserHandler{
		userStore:         cfg.UserStore,
		userRoleStoreForMe: cfg.UserRoleStoreForMe,
	}
}

type userResponse struct {
	ID        string `json:"id"`
	Username  string `json:"username"`
	AvatarURL string `json:"avatar_url,omitempty"`
}

// meResponse is the response for GET /v1/me (enriched with force_password_change, roles, permissions).
type meResponse struct {
	ID                  string   `json:"id"`
	Username            string   `json:"username"`
	AvatarURL           string   `json:"avatar_url,omitempty"`
	ForcePasswordChange bool     `json:"force_password_change"`
	Roles               []string `json:"roles"`
	Permissions         []string `json:"permissions"`
}

// ListUsers handles GET /v1/users.
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	users, err := h.userStore.List(ctx)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to list users")
		return
	}

	resp := make([]userResponse, len(users))
	for i, u := range users {
		resp[i] = userResponse{
			ID:        u.ID.String(),
			Username:  u.Username,
			AvatarURL: u.AvatarURL,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Me handles GET /v1/me. Returns the current authenticated user with force_password_change, roles, permissions.
func (h *UserHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	if claims == nil {
		WriteJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := uuid.Parse(claims.UserID)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid user in token")
		return
	}

	u, err := h.userStore.GetByID(ctx, id)
	if err != nil {
		WriteJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	resp := meResponse{
		ID:                  u.ID.String(),
		Username:            u.Username,
		AvatarURL:           u.AvatarURL,
		ForcePasswordChange: u.ForcePasswordChange,
		Roles:               nil,
		Permissions:         nil,
	}
	if h.userRoleStoreForMe != nil {
		roles, _ := h.userRoleStoreForMe.GetRolesByUserID(ctx, id)
		resp.Roles = make([]string, len(roles))
		for i := range roles {
			resp.Roles[i] = roles[i].Name
		}
		perms, _ := h.userRoleStoreForMe.GetPermissionsByUserID(ctx, id)
		resp.Permissions = make([]string, len(perms))
		for i := range perms {
			resp.Permissions[i] = perms[i].Key
		}
	}
	if resp.Roles == nil {
		resp.Roles = []string{}
	}
	if resp.Permissions == nil {
		resp.Permissions = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// GetUser handles GET /v1/users/{id}.
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	requestedID := r.PathValue("id")

	// Check if user is admin or requesting their own data
	isAdmin := slices.Contains(claims.Roles, "admin")
	if !isAdmin && claims.UserID != requestedID {
		WriteJSONError(w, http.StatusForbidden, "forbidden")
		return
	}

	id, err := uuid.Parse(requestedID)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	u, err := h.userStore.GetByID(ctx, id)
	if err != nil {
		WriteJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userResponse{
		ID:        u.ID.String(),
		Username:  u.Username,
		AvatarURL: u.AvatarURL,
	})
}

type createUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// CreateUser handles POST /v1/users.
func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	newUser := &user.User{
		ID:                  uuid.New(),
		Username:            req.Username,
		PasswordHash:        passwordHash,
		ForcePasswordChange: true,
	}

	ctx := r.Context()
	if err := h.userStore.Create(ctx, newUser); err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(userResponse{
		ID:        newUser.ID.String(),
		Username:  newUser.Username,
		AvatarURL: newUser.AvatarURL,
	})
}

type updateUserRequest struct {
	Username  string  `json:"username"`
	AvatarURL *string `json:"avatar_url"`
}

// UpdateUser handles PUT /v1/users/{id}.
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	requestedID := r.PathValue("id")

	// Check if user is admin or updating their own data
	isAdmin := slices.Contains(claims.Roles, "admin")
	if !isAdmin && claims.UserID != requestedID {
		WriteJSONError(w, http.StatusForbidden, "forbidden")
		return
	}

	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	requestedUuid, err := uuid.Parse(requestedID)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	u, err := h.userStore.GetByID(ctx, requestedUuid)
	if err != nil {
		WriteJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	u.Username = req.Username
	if req.AvatarURL != nil {
		u.AvatarURL = *req.AvatarURL
	}

	if err := h.userStore.Update(ctx, u); err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to update user")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userResponse{
		ID:        u.ID.String(),
		Username:  u.Username,
		AvatarURL: u.AvatarURL,
	})
}

type changePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// ChangePassword handles PUT /v1/users/{id}/password.
func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	requestedID := r.PathValue("id")

	// Check if user is admin or changing their own password
	isAdmin := slices.Contains(claims.Roles, "admin")
	if !isAdmin && claims.UserID != requestedID {
		WriteJSONError(w, http.StatusForbidden, "forbidden")
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	requestedUuid, err := uuid.Parse(requestedID)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	u, err := h.userStore.GetByID(ctx, requestedUuid)
	if err != nil {
		WriteJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	// Verify old password (unless admin is changing someone else's password)
	if !isAdmin || claims.UserID == requestedID {
		if err := auth.ComparePassword(u.PasswordHash, req.OldPassword); err != nil {
			WriteJSONError(w, http.StatusUnauthorized, "invalid old password")
			return
		}
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	u.PasswordHash = newHash
	u.ForcePasswordChange = false

	if err := h.userStore.Update(ctx, u); err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to update password")
		return
	}

	w.WriteHeader(http.StatusOK)
}
