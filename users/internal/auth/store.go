package auth

import (
	"context"
	"database/sql"
	"time"
)

// RefreshToken represents a stored refresh token.
type RefreshToken struct {
	ID        string
	UserID    string
	TokenHash string
	ExpiresAt time.Time
	Revoked   bool
	CreatedAt time.Time
}

// RefreshTokenStore defines the interface for refresh token persistence.
type RefreshTokenStore interface {
	Create(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (*RefreshToken, error)
	GetByHash(ctx context.Context, tokenHash string) (*RefreshToken, error)
	Revoke(ctx context.Context, id string) error
}

type refreshTokenStore struct {
	db *sql.DB
}

// NewRefreshTokenStore creates a new RefreshTokenStore backed by Postgres.
func NewRefreshTokenStore(db *sql.DB) RefreshTokenStore {
	return &refreshTokenStore{db: db}
}

func (s *refreshTokenStore) Create(ctx context.Context, userID, tokenHash string, expiresAt time.Time) (*RefreshToken, error) {
	var token RefreshToken
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING id, user_id, token_hash, expires_at, revoked, created_at`,
		userID, tokenHash, expiresAt,
	).Scan(&token.ID, &token.UserID, &token.TokenHash, &token.ExpiresAt, &token.Revoked, &token.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (s *refreshTokenStore) GetByHash(ctx context.Context, tokenHash string) (*RefreshToken, error) {
	var token RefreshToken
	err := s.db.QueryRowContext(ctx,
		`SELECT id, user_id, token_hash, expires_at, revoked, created_at
		 FROM refresh_tokens
		 WHERE token_hash = $1`,
		tokenHash,
	).Scan(&token.ID, &token.UserID, &token.TokenHash, &token.ExpiresAt, &token.Revoked, &token.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &token, nil
}

func (s *refreshTokenStore) Revoke(ctx context.Context, id string) error {
	_, err := s.db.ExecContext(ctx,
		`UPDATE refresh_tokens SET revoked = true WHERE id = $1`,
		id,
	)
	return err
}
