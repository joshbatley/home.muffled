package user

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Store interface {
	Create(ctx context.Context, u *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	List(ctx context.Context) ([]User, error)
	Update(ctx context.Context, u *User) error
}

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) Create(ctx context.Context, u *User) error {
	prefs := u.Preferences
	if len(prefs) == 0 {
		prefs = json.RawMessage(`{}`)
	}
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO users (id, email, password_hash, force_password_change, display_name, avatar_url, preferences)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		u.ID, u.Email, u.PasswordHash, u.ForcePasswordChange, nullStr(u.DisplayName), nullStr(u.AvatarURL), prefs)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return fmt.Errorf("%w: %s", ErrDuplicateEmail, u.Email)
		}
		return fmt.Errorf("creating user: %w", err)
	}
	return nil
}

func nullStr(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

func (s *PostgresStore) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var u User
	var displayName, avatarURL sql.NullString
	var prefs []byte
	err := s.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, force_password_change, display_name, avatar_url, preferences, created_at, updated_at
		 FROM users WHERE id = $1`,
		id,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.ForcePasswordChange, &displayName, &avatarURL, &prefs, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user: %w", err)
	}
	u.DisplayName = displayName.String
	u.AvatarURL = avatarURL.String
	u.Preferences = prefs
	return &u, nil
}

func (s *PostgresStore) GetByEmail(ctx context.Context, email string) (*User, error) {
	var u User
	var displayName, avatarURL sql.NullString
	var prefs []byte
	err := s.db.QueryRowContext(ctx,
		`SELECT id, email, password_hash, force_password_change, display_name, avatar_url, preferences, created_at, updated_at
		 FROM users WHERE lower(email) = lower($1)`,
		email,
	).Scan(&u.ID, &u.Email, &u.PasswordHash, &u.ForcePasswordChange, &displayName, &avatarURL, &prefs, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user by email: %w", err)
	}
	u.DisplayName = displayName.String
	u.AvatarURL = avatarURL.String
	u.Preferences = prefs
	return &u, nil
}

func (s *PostgresStore) List(ctx context.Context) ([]User, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, email, password_hash, force_password_change, display_name, avatar_url, preferences, created_at, updated_at
		 FROM users ORDER BY email`)
	if err != nil {
		return nil, fmt.Errorf("listing users: %w", err)
	}
	defer rows.Close()

	var out []User
	for rows.Next() {
		var u User
		var displayName, avatarURL sql.NullString
		var prefs []byte
		if err := rows.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.ForcePasswordChange, &displayName, &avatarURL, &prefs, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning user: %w", err)
		}
		u.DisplayName = displayName.String
		u.AvatarURL = avatarURL.String
		u.Preferences = prefs
		out = append(out, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *PostgresStore) Update(ctx context.Context, u *User) error {
	prefs := u.Preferences
	if len(prefs) == 0 {
		prefs = json.RawMessage(`{}`)
	}
	res, err := s.db.ExecContext(ctx,
		`UPDATE users SET email = $1, password_hash = $2, force_password_change = $3, display_name = $4, avatar_url = $5, preferences = $6, updated_at = $7
		 WHERE id = $8`,
		u.Email, u.PasswordHash, u.ForcePasswordChange, nullStr(u.DisplayName), nullStr(u.AvatarURL), prefs, time.Now(), u.ID)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return fmt.Errorf("%w: %s", ErrDuplicateEmail, u.Email)
		}
		return fmt.Errorf("updating user: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}
