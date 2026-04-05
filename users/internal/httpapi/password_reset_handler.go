package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"users2/internal/auth"
	"users2/internal/mail"
	"users2/internal/user"

)

type Mailer interface {
	Configured() bool
	Send(to []string, subject, body string) error
}

type PasswordResetDeps struct {
	UserStore    user.Store
	ResetStore   auth.PasswordResetStore
	Mailer       Mailer
	PublicBaseURL string
	ResetTTL     time.Duration
}

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

func ForgotPassword(deps PasswordResetDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req forgotPasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		ctx := r.Context()
		u, err := deps.UserStore.GetByEmail(ctx, req.Email)
		if err != nil {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		raw, err := auth.GenerateRefreshToken()
		if err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to generate token")
			return
		}
		hash := auth.HashRefreshToken(raw)
		exp := time.Now().Add(deps.ResetTTL)
		if err := deps.ResetStore.Create(ctx, u.ID, hash, exp); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to save token")
			return
		}

		if deps.Mailer != nil && deps.Mailer.Configured() && deps.PublicBaseURL != "" {
			resetURL := deps.PublicBaseURL + "/reset?token=" + raw
			subj, body := mail.PasswordReset(resetURL)
			_ = deps.Mailer.Send([]string{u.Email}, subj, body)
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

type resetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func ResetPassword(deps PasswordResetDeps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req resetPasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if req.Token == "" || len(req.NewPassword) < 8 {
			WriteJSONError(w, http.StatusBadRequest, "invalid token or password")
			return
		}

		hash := auth.HashRefreshToken(req.Token)
		ctx := r.Context()
		rt, err := deps.ResetStore.GetValidByHash(ctx, hash)
		if err != nil {
			WriteJSONError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		newHash, err := auth.HashPassword(req.NewPassword)
		if err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to hash password")
			return
		}

		u, err := deps.UserStore.GetByID(ctx, rt.UserID)
		if err != nil {
			WriteJSONError(w, http.StatusNotFound, "user not found")
			return
		}
		u.PasswordHash = newHash
		u.ForcePasswordChange = false
		if err := deps.UserStore.Update(ctx, u); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to update password")
			return
		}
		if err := deps.ResetStore.MarkUsed(ctx, rt.ID); err != nil {
			WriteJSONError(w, http.StatusInternalServerError, "failed to finalize reset")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
