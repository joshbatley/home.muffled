package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"slices"

	"users/internal/api/middleware"
	"users/internal/auth"
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

// UserHandlerConfig holds configuration for the user handler.
type UserHandlerConfig struct {
	UserStore UserStoreForUsers
}

// UserHandler handles user endpoints.
type UserHandler struct {
	userStore UserStoreForUsers
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(cfg UserHandlerConfig) *UserHandler {
	return &UserHandler{
		userStore: cfg.UserStore,
	}
}

type userResponse struct {
	ID       string `json:"id"`
	Username string `json:"username"`
}

// ListUsers handles GET /v1/users.
func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	users, err := h.userStore.List(ctx)
	if err != nil {
		http.Error(w, "failed to list users", http.StatusInternalServerError)
		return
	}

	resp := make([]userResponse, len(users))
	for i, u := range users {
		resp[i] = userResponse{
			ID:       u.ID.String(),
			Username: u.Username,
		}
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
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	id, err := uuid.Parse(requestedID)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}

	u, err := h.userStore.GetByID(ctx, id)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userResponse{
		ID:       u.ID.String(),
		Username: u.Username,
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
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		http.Error(w, "failed to hash password", http.StatusInternalServerError)
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
		http.Error(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(userResponse{
		ID:       newUser.ID.String(),
		Username: newUser.Username,
	})
}

type updateUserRequest struct {
	Username string `json:"username"`
}

// UpdateUser handles PUT /v1/users/{id}.
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	requestedID := r.PathValue("id")

	// Check if user is admin or updating their own data
	isAdmin := slices.Contains(claims.Roles, "admin")
	if !isAdmin && claims.UserID != requestedID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	requestedUuid, err := uuid.Parse(requestedID)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}
	u, err := h.userStore.GetByID(ctx, requestedUuid)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	u.Username = req.Username

	if err := h.userStore.Update(ctx, u); err != nil {
		http.Error(w, "failed to update user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(userResponse{
		ID:       u.ID.String(),
		Username: u.Username,
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
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	requestedUuid, err := uuid.Parse(requestedID)
	if err != nil {
		http.Error(w, "invalid user id", http.StatusBadRequest)
		return
	}
	u, err := h.userStore.GetByID(ctx, requestedUuid)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	// Verify old password (unless admin is changing someone else's password)
	if !isAdmin || claims.UserID == requestedID {
		if err := auth.ComparePassword(u.PasswordHash, req.OldPassword); err != nil {
			http.Error(w, "invalid old password", http.StatusUnauthorized)
			return
		}
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		http.Error(w, "failed to hash password", http.StatusInternalServerError)
		return
	}

	u.PasswordHash = newHash
	u.ForcePasswordChange = false

	if err := h.userStore.Update(ctx, u); err != nil {
		http.Error(w, "failed to update password", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
