package role

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

var (
	ErrNotFound            = errors.New("role not found")
	ErrDuplicateRole       = errors.New("role already exists")
	ErrDuplicatePermission = errors.New("permission key already exists")
	ErrPermissionNotFound  = errors.New("permission not found")
)

type Role struct {
	ID        uuid.UUID
	Name      string
	CreatedAt time.Time
}

type Permission struct {
	ID          uuid.UUID
	Key         string
	Description string
	CreatedAt   time.Time
}
