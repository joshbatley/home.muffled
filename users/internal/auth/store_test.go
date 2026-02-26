package auth

import (
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
)

func TestRefreshTokenStore_create_and_get(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewRefreshTokenStore(db)
	ctx := t.Context()

	userID := "user-123"
	tokenHash := "abc123hash"
	expiresAt := time.Now().Add(7 * 24 * time.Hour).Truncate(time.Microsecond)
	createdAt := time.Now().Truncate(time.Microsecond)
	tokenID := "token-456"

	// Expect Create
	rows := sqlmock.NewRows([]string{"id", "user_id", "token_hash", "expires_at", "revoked", "created_at"}).
		AddRow(tokenID, userID, tokenHash, expiresAt, false, createdAt)
	mock.ExpectQuery(`INSERT INTO refresh_tokens`).
		WithArgs(userID, tokenHash, expiresAt).
		WillReturnRows(rows)

	token, err := store.Create(ctx, userID, tokenHash, expiresAt)
	if err != nil {
		t.Fatalf("Create() error = %v", err)
	}

	if token.ID != tokenID {
		t.Errorf("token.ID = %q, want %q", token.ID, tokenID)
	}
	if token.UserID != userID {
		t.Errorf("token.UserID = %q, want %q", token.UserID, userID)
	}
	if token.TokenHash != tokenHash {
		t.Errorf("token.TokenHash = %q, want %q", token.TokenHash, tokenHash)
	}
	if token.Revoked {
		t.Error("token.Revoked = true, want false")
	}

	// Expect GetByHash
	rows2 := sqlmock.NewRows([]string{"id", "user_id", "token_hash", "expires_at", "revoked", "created_at"}).
		AddRow(tokenID, userID, tokenHash, expiresAt, false, createdAt)
	mock.ExpectQuery(`SELECT .+ FROM refresh_tokens`).
		WithArgs(tokenHash).
		WillReturnRows(rows2)

	retrieved, err := store.GetByHash(ctx, tokenHash)
	if err != nil {
		t.Fatalf("GetByHash() error = %v", err)
	}

	if retrieved.ID != tokenID {
		t.Errorf("retrieved.ID = %q, want %q", retrieved.ID, tokenID)
	}
	if retrieved.UserID != userID {
		t.Errorf("retrieved.UserID = %q, want %q", retrieved.UserID, userID)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestRefreshTokenStore_revoked_token_is_rejected(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewRefreshTokenStore(db)
	ctx := t.Context()

	tokenID := "token-456"
	tokenHash := "abc123hash"

	// Expect Revoke
	mock.ExpectExec(`UPDATE refresh_tokens SET revoked = true`).
		WithArgs(tokenID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = store.Revoke(ctx, tokenID)
	if err != nil {
		t.Fatalf("Revoke() error = %v", err)
	}

	// Expect GetByHash returns revoked token
	rows := sqlmock.NewRows([]string{"id", "user_id", "token_hash", "expires_at", "revoked", "created_at"}).
		AddRow(tokenID, "user-123", tokenHash, time.Now().Add(time.Hour), true, time.Now())
	mock.ExpectQuery(`SELECT .+ FROM refresh_tokens`).
		WithArgs(tokenHash).
		WillReturnRows(rows)

	token, err := store.GetByHash(ctx, tokenHash)
	if err != nil {
		t.Fatalf("GetByHash() error = %v", err)
	}

	if !token.Revoked {
		t.Error("token.Revoked = false, want true")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}

func TestRefreshTokenStore_expired_token_is_rejected(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	defer db.Close()

	store := NewRefreshTokenStore(db)
	ctx := t.Context()

	tokenHash := "abc123hash"
	expiredAt := time.Now().Add(-1 * time.Hour) // already expired

	// Expect GetByHash returns expired token
	rows := sqlmock.NewRows([]string{"id", "user_id", "token_hash", "expires_at", "revoked", "created_at"}).
		AddRow("token-456", "user-123", tokenHash, expiredAt, false, time.Now().Add(-2*time.Hour))
	mock.ExpectQuery(`SELECT .+ FROM refresh_tokens`).
		WithArgs(tokenHash).
		WillReturnRows(rows)

	token, err := store.GetByHash(ctx, tokenHash)
	if err != nil {
		t.Fatalf("GetByHash() error = %v", err)
	}

	if time.Now().Before(token.ExpiresAt) {
		t.Error("token should be expired")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled expectations: %v", err)
	}
}
