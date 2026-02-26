// Package user provides user domain types and storage.
package user

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// Sentinel errors for user operations.
var (
	ErrNotFound          = errors.New("user not found")
	ErrDuplicateUsername = errors.New("username already exists")
)

// User represents a user in the system.
type User struct {
	ID                  uuid.UUID
	Username            string
	PasswordHash        string
	ForcePasswordChange bool
	CreatedAt           time.Time
	UpdatedAt           time.Time
}
