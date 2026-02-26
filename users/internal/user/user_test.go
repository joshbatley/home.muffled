package user

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestUser_TypeExists(t *testing.T) {
	now := time.Now()
	u := User{
		ID:                  uuid.New(),
		Username:            "testuser",
		PasswordHash:        "hashedpassword",
		ForcePasswordChange: false,
		CreatedAt:           now,
		UpdatedAt:           now,
	}

	if u.Username != "testuser" {
		t.Errorf("expected username 'testuser', got %q", u.Username)
	}
}
