package role

import (
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

func TestPostgresStore_create_role_and_retrieve(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	// Create role
	createdAt := time.Now()
	insertRows := sqlmock.NewRows([]string{"id", "name", "created_at"}).
		AddRow(uuid.New(), "admin", createdAt)

	mock.ExpectQuery("INSERT INTO roles .+ VALUES .+ RETURNING id, name, created_at").
		WithArgs("admin").
		WillReturnRows(insertRows)

	role, err := store.CreateRole(ctx, "admin")
	if err != nil {
		t.Fatalf("CreateRole failed: %v", err)
	}

	if role.Name != "admin" {
		t.Errorf("CreateRole name = %q, want %q", role.Name, "admin")
	}

	// Retrieve by ID
	retrieveRows := sqlmock.NewRows([]string{"id", "name", "created_at"}).
		AddRow(role.ID, role.Name, role.CreatedAt)

	mock.ExpectQuery("SELECT .+ FROM roles WHERE id = \\$1").
		WithArgs(role.ID).
		WillReturnRows(retrieveRows)

	got, err := store.GetByID(ctx, role.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	if got.ID != role.ID {
		t.Errorf("GetByID ID = %v, want %v", got.ID, role.ID)
	}
	if got.Name != "admin" {
		t.Errorf("GetByID Name = %q, want %q", got.Name, "admin")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_list_roles(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "created_at"}).
		AddRow(uuid.New(), "admin", now).
		AddRow(uuid.New(), "viewer", now)

	mock.ExpectQuery("SELECT .+ FROM roles").
		WillReturnRows(rows)

	roles, err := store.List(ctx)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(roles) != 2 {
		t.Fatalf("List returned %d roles, want 2", len(roles))
	}
	if roles[0].Name != "admin" {
		t.Errorf("roles[0].Name = %q, want %q", roles[0].Name, "admin")
	}
	if roles[1].Name != "viewer" {
		t.Errorf("roles[1].Name = %q, want %q", roles[1].Name, "viewer")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_delete_role(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	roleID := uuid.New()

	mock.ExpectExec("DELETE FROM roles WHERE id = \\$1").
		WithArgs(roleID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = store.Delete(ctx, roleID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Deleted role should not be found
	mock.ExpectQuery("SELECT .+ FROM roles WHERE id = \\$1").
		WithArgs(roleID).
		WillReturnError(sql.ErrNoRows)

	_, err = store.GetByID(ctx, roleID)
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("GetByID after Delete: got err %v, want ErrNotFound", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_GetRoleByName(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	id := uuid.New()
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "created_at"}).
		AddRow(id, "admin", now)

	mock.ExpectQuery("SELECT .+ FROM roles WHERE name = \\$1").
		WithArgs("admin").
		WillReturnRows(rows)

	got, err := store.GetRoleByName(ctx, "admin")
	if err != nil {
		t.Fatalf("GetRoleByName failed: %v", err)
	}
	if got.Name != "admin" || got.ID != id {
		t.Errorf("GetRoleByName = %+v, want name=admin id=%v", got, id)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_AssignRoleToUser(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	userID := uuid.New()
	roleID := uuid.New()

	mock.ExpectExec("INSERT INTO user_roles .+").
		WithArgs(userID, roleID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = store.AssignRoleToUser(ctx, userID, roleID)
	if err != nil {
		t.Fatalf("AssignRoleToUser failed: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_GetUserRoles(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	userID := uuid.New()
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "created_at"}).
		AddRow(uuid.New(), "admin", now)

	mock.ExpectQuery("SELECT .+ FROM roles .+ user_roles .+ .*user_id = \\$1").
		WithArgs(userID).
		WillReturnRows(rows)

	roles, err := store.GetUserRoles(ctx, userID)
	if err != nil {
		t.Fatalf("GetUserRoles failed: %v", err)
	}
	if len(roles) != 1 || roles[0].Name != "admin" {
		t.Errorf("GetUserRoles = %+v, want one role named admin", roles)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

// PermissionStore tests

func TestPostgresPermissionStore_create_permission_and_retrieve(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresPermissionStore(db)
	ctx := t.Context()

	permID := uuid.New()
	now := time.Now()
	insertRows := sqlmock.NewRows([]string{"id", "key", "description", "created_at"}).
		AddRow(permID, "users:read", "Read users", now)

	mock.ExpectQuery("INSERT INTO permissions .+ RETURNING id, key, description, created_at").
		WithArgs("users:read", "Read users").
		WillReturnRows(insertRows)

	perm, err := store.Create(ctx, "users:read", "Read users")
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if perm.Key != "users:read" {
		t.Errorf("Create Key = %q, want users:read", perm.Key)
	}

	getRows := sqlmock.NewRows([]string{"id", "key", "description", "created_at"}).
		AddRow(perm.ID, perm.Key, perm.Description, perm.CreatedAt)
	mock.ExpectQuery("SELECT .+ FROM permissions WHERE id = \\$1").
		WithArgs(perm.ID).
		WillReturnRows(getRows)

	got, err := store.GetByID(ctx, perm.ID)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}
	if got.Key != "users:read" || got.Description != "Read users" {
		t.Errorf("GetByID = %+v", got)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresPermissionStore_list_permissions(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresPermissionStore(db)
	ctx := t.Context()

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "key", "description", "created_at"}).
		AddRow(uuid.New(), "users:read", "Read", now).
		AddRow(uuid.New(), "users:write", "Write", now)

	mock.ExpectQuery("SELECT .+ FROM permissions").
		WillReturnRows(rows)

	perms, err := store.List(ctx)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(perms) != 2 {
		t.Fatalf("List returned %d, want 2", len(perms))
	}
	if perms[0].Key != "users:read" || perms[1].Key != "users:write" {
		t.Errorf("List = %+v", perms)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresPermissionStore_delete_permission(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresPermissionStore(db)
	ctx := t.Context()

	permID := uuid.New()
	mock.ExpectExec("DELETE FROM permissions WHERE id = \\$1").
		WithArgs(permID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = store.Delete(ctx, permID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_assign_permission_to_role(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	roleID := uuid.New()
	permID := uuid.New()

	mock.ExpectExec("INSERT INTO role_permissions .+").
		WithArgs(roleID, permID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = store.AssignPermission(ctx, roleID, permID)
	if err != nil {
		t.Fatalf("AssignPermission failed: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_remove_permission_from_role(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	roleID := uuid.New()
	permID := uuid.New()

	mock.ExpectExec("DELETE FROM role_permissions WHERE role_id = \\$1 AND permission_id = \\$2").
		WithArgs(roleID, permID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = store.RemovePermission(ctx, roleID, permID)
	if err != nil {
		t.Fatalf("RemovePermission failed: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_remove_role_from_user(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	userID := uuid.New()
	roleID := uuid.New()

	mock.ExpectExec("DELETE FROM user_roles WHERE user_id = \\$1 AND role_id = \\$2").
		WithArgs(userID, roleID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = store.RemoveRole(ctx, userID, roleID)
	if err != nil {
		t.Fatalf("RemoveRole failed: %v", err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_get_users_roles(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	userID := uuid.New()
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "name", "created_at"}).
		AddRow(uuid.New(), "admin", now).
		AddRow(uuid.New(), "viewer", now)

	mock.ExpectQuery("SELECT .+ FROM roles .+ user_roles .+ .*user_id = \\$1").
		WithArgs(userID).
		WillReturnRows(rows)

	roles, err := store.GetRolesByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("GetRolesByUserID failed: %v", err)
	}
	if len(roles) != 2 {
		t.Fatalf("GetRolesByUserID returned %d, want 2", len(roles))
	}
	if roles[0].Name != "admin" || roles[1].Name != "viewer" {
		t.Errorf("GetRolesByUserID = %+v", roles)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_get_users_permissions(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	userID := uuid.New()
	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "key", "description", "created_at"}).
		AddRow(uuid.New(), "users:read", "Read users", now).
		AddRow(uuid.New(), "users:write", "Write users", now)

	mock.ExpectQuery("SELECT DISTINCT .+ FROM permissions .+ role_permissions .+ user_roles .+ .*user_id = \\$1").
		WithArgs(userID).
		WillReturnRows(rows)

	perms, err := store.GetPermissionsByUserID(ctx, userID)
	if err != nil {
		t.Fatalf("GetPermissionsByUserID failed: %v", err)
	}
	if len(perms) != 2 {
		t.Fatalf("GetPermissionsByUserID returned %d, want 2", len(perms))
	}
	if perms[0].Key != "users:read" || perms[1].Key != "users:write" {
		t.Errorf("GetPermissionsByUserID = %+v", perms)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}
