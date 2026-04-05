package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/mail"
	"slices"

	"users2/internal/auth"
	"users2/internal/httpapi/middleware"
	mailtpl "users2/internal/mail"
	"users2/internal/role"
	"users2/internal/user"

	"github.com/google/uuid"
)

type UserHandlerConfig struct {
	UserStore          user.Store
	RoleStore          UserRoleMe
	WelcomeMailer      Mailer
	PublicBaseURL      string
	IntranetDisplayName string
}

type UserRoleMe interface {
	GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]role.Role, error)
	GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]role.Permission, error)
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
}

type UserHandler struct {
	userStore    user.Store
	roleStore    UserRoleMe
	welcomeMail  Mailer
	publicBase   string
	intranetName string
}

func isAdminOrSelf(claims *auth.Claims, userID string) bool {
	return slices.Contains(claims.Roles, "admin") ||
		slices.Contains(claims.Permissions, middleware.PermUsersAdmin) ||
		claims.UserID == userID
}

func NewUserHandler(cfg UserHandlerConfig) *UserHandler {
	name := cfg.IntranetDisplayName
	if name == "" {
		name = "home.muffled intranet"
	}
	return &UserHandler{
		userStore:    cfg.UserStore,
		roleStore:    cfg.RoleStore,
		welcomeMail:  cfg.WelcomeMailer,
		publicBase:   cfg.PublicBaseURL,
		intranetName: name,
	}
}

type userResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name,omitempty"`
	AvatarURL   string `json:"avatar_url,omitempty"`
}

type meResponse struct {
	ID                  string          `json:"id"`
	Email               string          `json:"email"`
	DisplayName         string          `json:"display_name,omitempty"`
	AvatarURL           string          `json:"avatar_url,omitempty"`
	Preferences         json.RawMessage `json:"preferences"`
	ForcePasswordChange bool            `json:"force_password_change"`
	Roles               []string        `json:"roles"`
	Permissions         []string        `json:"permissions"`
}

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	users, err := h.userStore.List(ctx)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to list users")
		return
	}
	out := make([]userResponse, len(users))
	for i, u := range users {
		out[i] = userResponse{
			ID:          u.ID.String(),
			Email:       u.Email,
			DisplayName: u.DisplayName,
			AvatarURL:   u.AvatarURL,
		}
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(out)
}

func (h *UserHandler) Me(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	if claims == nil {
		WriteJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, err := uuid.Parse(claims.UserID)
	if err != nil {
		WriteJSONError(w, http.StatusUnauthorized, "invalid user")
		return
	}
	u, err := h.userStore.GetByID(ctx, id)
	if err != nil {
		WriteJSONError(w, http.StatusNotFound, "user not found")
		return
	}
	resp := meResponse{
		ID:                  u.ID.String(),
		Email:               u.Email,
		DisplayName:         u.DisplayName,
		AvatarURL:           u.AvatarURL,
		Preferences:         u.Preferences,
		ForcePasswordChange: u.ForcePasswordChange,
		Roles:               nil,
		Permissions:         nil,
	}
	if h.roleStore != nil {
		roles, err := h.roleStore.GetRolesByUserID(ctx, id)
		if err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to fetch roles")
			return
		}
		resp.Roles = role.RoleNames(roles)
		perms, err := h.roleStore.GetPermissionsByUserID(ctx, id)
		if err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to fetch permissions")
			return
		}
		resp.Permissions = role.PermissionKeys(perms)
	}
	if resp.Roles == nil {
		resp.Roles = []string{}
	}
	if resp.Permissions == nil {
		resp.Permissions = []string{}
	}
	if len(resp.Preferences) == 0 {
		resp.Preferences = json.RawMessage(`{}`)
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	idStr := r.PathValue("id")
	if !isAdminOrSelf(claims, idStr) {
		WriteJSONError(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := uuid.Parse(idStr)
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
	_ = json.NewEncoder(w).Encode(userResponse{
		ID: u.ID.String(), Email: u.Email, DisplayName: u.DisplayName, AvatarURL: u.AvatarURL,
	})
}

type createUserRequest struct {
	Email    string   `json:"email"`
	Password string   `json:"password"`
	RoleIDs  []string `json:"role_ids"`
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil || req.Password == "" {
		WriteJSONError(w, http.StatusBadRequest, "valid email and password required")
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}
	newUser := &user.User{
		ID:                  uuid.New(),
		Email:               req.Email,
		PasswordHash:        hash,
		ForcePasswordChange: true,
	}
	ctx := r.Context()
	if err := h.userStore.Create(ctx, newUser); err != nil {
		if errors.Is(err, user.ErrDuplicateEmail) {
			WriteJSONError(w, http.StatusConflict, "email already exists")
			return
		}
		WriteJSONError(w, http.StatusInternalServerError, "failed to create user")
		return
	}
	for _, rid := range req.RoleIDs {
		ridUUID, err := uuid.Parse(rid)
		if err != nil {
			continue
		}
		if h.roleStore != nil {
			_ = h.roleStore.AssignRoleToUser(ctx, newUser.ID, ridUUID)
		}
	}

	if h.welcomeMail != nil && h.welcomeMail.Configured() && h.publicBase != "" {
		subj, body := mailtpl.WelcomeIntranet(h.intranetName, h.publicBase)
		_ = h.welcomeMail.Send([]string{newUser.Email}, subj, body)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(userResponse{
		ID: newUser.ID.String(), Email: newUser.Email,
	})
}

type updateUserRequest struct {
	Email       *string         `json:"email"`
	DisplayName *string         `json:"display_name"`
	AvatarURL   *string         `json:"avatar_url"`
	Preferences json.RawMessage `json:"preferences"`
}

func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	idStr := r.PathValue("id")
	if !isAdminOrSelf(claims, idStr) {
		WriteJSONError(w, http.StatusForbidden, "forbidden")
		return
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	u, err := h.userStore.GetByID(ctx, id)
	if err != nil {
		WriteJSONError(w, http.StatusNotFound, "user not found")
		return
	}
	if req.Email != nil {
		if _, err := mail.ParseAddress(*req.Email); err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid email")
			return
		}
		u.Email = *req.Email
	}
	if req.DisplayName != nil {
		u.DisplayName = *req.DisplayName
	}
	if req.AvatarURL != nil {
		u.AvatarURL = *req.AvatarURL
	}
	if len(req.Preferences) > 0 {
		u.Preferences = req.Preferences
	}
	if err := h.userStore.Update(ctx, u); err != nil {
		WriteJSONError(w, http.StatusInternalServerError, "failed to update user")
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(userResponse{
		ID: u.ID.String(), Email: u.Email, DisplayName: u.DisplayName, AvatarURL: u.AvatarURL,
	})
}

type changePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

func (h *UserHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	claims := middleware.ClaimsFromContext(ctx)
	idStr := r.PathValue("id")
	if !isAdminOrSelf(claims, idStr) {
		WriteJSONError(w, http.StatusForbidden, "forbidden")
		return
	}
	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if len(req.NewPassword) < 8 {
		WriteJSONError(w, http.StatusBadRequest, "password too short")
		return
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		WriteJSONError(w, http.StatusBadRequest, "invalid user id")
		return
	}
	u, err := h.userStore.GetByID(ctx, id)
	if err != nil {
		WriteJSONError(w, http.StatusNotFound, "user not found")
		return
	}
	isAdmin := slices.Contains(claims.Roles, "admin") || slices.Contains(claims.Permissions, middleware.PermUsersAdmin)
	if !isAdmin || claims.UserID == idStr {
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
	w.WriteHeader(http.StatusNoContent)
}
