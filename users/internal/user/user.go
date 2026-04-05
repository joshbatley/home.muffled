package user

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound      = errors.New("user not found")
	ErrDuplicateEmail = errors.New("email already exists")
)

type User struct {
	ID                  uuid.UUID
	Email               string
	PasswordHash        string
	ForcePasswordChange bool
	DisplayName         string
	AvatarURL           string
	Preferences         json.RawMessage
	CreatedAt           time.Time
	UpdatedAt           time.Time
}
