package role

import (
	"testing"

	"github.com/google/uuid"
)

func TestPostgresStore_CreateRole(t *testing.T) {
	store := NewPostgresStore(nil)
	_ = store

	t.Fatal("test not implemented")
}

func TestPostgresStore_GetRoleByName(t *testing.T) {
	t.Fatal("test not implemented")
}

func TestPostgresStore_AssignRoleToUser(t *testing.T) {
	t.Fatal("test not implemented")
}

func TestPostgresStore_GetUserRoles(t *testing.T) {
	_ = uuid.New()
	t.Fatal("test not implemented")
}
