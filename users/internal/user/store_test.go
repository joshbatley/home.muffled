package user

import (
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

func TestPostgresStore_Create(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	user := &User{
		ID:                  uuid.New(),
		Username:            "testuser",
		PasswordHash:        "hashedpassword",
		ForcePasswordChange: false,
	}

	mock.ExpectExec("INSERT INTO users").
		WithArgs(user.ID, user.Username, user.PasswordHash, user.ForcePasswordChange).
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := store.Create(ctx, user); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_GetByID(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	id := uuid.New()
	now := time.Now()

	rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "force_password_change", "created_at", "updated_at"}).
		AddRow(id, "testuser", "hashedpassword", false, now, now)

	mock.ExpectQuery("SELECT .+ FROM users WHERE id = \\$1").
		WithArgs(id).
		WillReturnRows(rows)

	got, err := store.GetByID(ctx, id)
	if err != nil {
		t.Fatalf("GetByID failed: %v", err)
	}

	if got.ID != id {
		t.Errorf("ID mismatch: got %v, want %v", got.ID, id)
	}
	if got.Username != "testuser" {
		t.Errorf("Username mismatch: got %q, want %q", got.Username, "testuser")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_GetByID_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	id := uuid.New()

	mock.ExpectQuery("SELECT .+ FROM users WHERE id = \\$1").
		WithArgs(id).
		WillReturnError(sql.ErrNoRows)

	_, err = store.GetByID(ctx, id)
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_GetByUsername(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	id := uuid.New()
	now := time.Now()

	rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "force_password_change", "created_at", "updated_at"}).
		AddRow(id, "findme", "hashedpassword", false, now, now)

	mock.ExpectQuery("SELECT .+ FROM users WHERE username = \\$1").
		WithArgs("findme").
		WillReturnRows(rows)

	got, err := store.GetByUsername(ctx, "findme")
	if err != nil {
		t.Fatalf("GetByUsername failed: %v", err)
	}

	if got.Username != "findme" {
		t.Errorf("Username mismatch: got %q, want %q", got.Username, "findme")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_List(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	now := time.Now()

	rows := sqlmock.NewRows([]string{"id", "username", "password_hash", "force_password_change", "created_at", "updated_at"}).
		AddRow(uuid.New(), "user1", "hash1", false, now, now).
		AddRow(uuid.New(), "user2", "hash2", false, now, now)

	mock.ExpectQuery("SELECT .+ FROM users").
		WillReturnRows(rows)

	users, err := store.List(ctx)
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(users) != 2 {
		t.Errorf("expected 2 users, got %d", len(users))
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_Update(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	user := &User{
		ID:                  uuid.New(),
		Username:            "updated",
		PasswordHash:        "newhash",
		ForcePasswordChange: true,
	}

	mock.ExpectExec("UPDATE users SET").
		WithArgs(user.Username, user.PasswordHash, user.ForcePasswordChange, sqlmock.AnyArg(), user.ID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := store.Update(ctx, user); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_Update_NotFound(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	user := &User{
		ID:       uuid.New(),
		Username: "nonexistent",
	}

	mock.ExpectExec("UPDATE users SET").
		WithArgs(user.Username, user.PasswordHash, user.ForcePasswordChange, sqlmock.AnyArg(), user.ID).
		WillReturnResult(sqlmock.NewResult(0, 0))

	err = store.Update(ctx, user)
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestPostgresStore_CreateDuplicateUsername(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewPostgresStore(db)
	ctx := t.Context()

	user := &User{
		ID:       uuid.New(),
		Username: "duplicate",
	}

	mock.ExpectExec("INSERT INTO users").
		WithArgs(user.ID, user.Username, user.PasswordHash, user.ForcePasswordChange).
		WillReturnError(errors.New("pq: duplicate key value violates unique constraint"))

	err = store.Create(ctx, user)
	if !errors.Is(err, ErrDuplicateUsername) {
		t.Errorf("expected ErrDuplicateUsername, got %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}
