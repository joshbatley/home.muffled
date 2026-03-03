package user

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Store defines the interface for user persistence.
type Store interface {
	Create(ctx context.Context, user *User) error
	GetByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetByUsername(ctx context.Context, username string) (*User, error)
	List(ctx context.Context) ([]User, error)
	Update(ctx context.Context, user *User) error
}

// PostgresStore implements Store using PostgreSQL.
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore creates a new PostgresStore.
func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

// Create inserts a new user.
func (s *PostgresStore) Create(ctx context.Context, user *User) error {
	avatarURL := nullString(user.AvatarURL)
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO users (id, username, password_hash, force_password_change, avatar_url) VALUES ($1, $2, $3, $4, $5)",
		user.ID, user.Username, user.PasswordHash, user.ForcePasswordChange, avatarURL)
	if err != nil {
		if strings.Contains(err.Error(), "duplicate key") {
			return fmt.Errorf("%w: %s", ErrDuplicateUsername, user.Username)
		}
		return fmt.Errorf("creating user: %w", err)
	}
	return nil
}

func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: s, Valid: true}
}

// GetByID retrieves a user by ID.
func (s *PostgresStore) GetByID(ctx context.Context, id uuid.UUID) (*User, error) {
	var u User
	var avatarURL sql.NullString
	err := s.db.QueryRowContext(ctx,
		"SELECT id, username, password_hash, force_password_change, avatar_url, created_at, updated_at FROM users WHERE id = $1",
		id).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.ForcePasswordChange, &avatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user by id: %w", err)
	}
	u.AvatarURL = avatarURL.String
	return &u, nil
}

// GetByUsername retrieves a user by username.
func (s *PostgresStore) GetByUsername(ctx context.Context, username string) (*User, error) {
	var u User
	var avatarURL sql.NullString
	err := s.db.QueryRowContext(ctx,
		"SELECT id, username, password_hash, force_password_change, avatar_url, created_at, updated_at FROM users WHERE username = $1",
		username).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.ForcePasswordChange, &avatarURL, &u.CreatedAt, &u.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting user by username: %w", err)
	}
	u.AvatarURL = avatarURL.String
	return &u, nil
}

// List returns all users.
func (s *PostgresStore) List(ctx context.Context) ([]User, error) {
	rows, err := s.db.QueryContext(ctx,
		"SELECT id, username, password_hash, force_password_change, avatar_url, created_at, updated_at FROM users")
	if err != nil {
		return nil, fmt.Errorf("listing users: %w", err)
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var u User
		var avatarURL sql.NullString
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.ForcePasswordChange, &avatarURL, &u.CreatedAt, &u.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning user: %w", err)
		}
		u.AvatarURL = avatarURL.String
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating users: %w", err)
	}
	return users, nil
}

// Update updates an existing user.
func (s *PostgresStore) Update(ctx context.Context, user *User) error {
	avatarURL := nullString(user.AvatarURL)
	result, err := s.db.ExecContext(ctx,
		"UPDATE users SET username = $1, password_hash = $2, force_password_change = $3, avatar_url = $4, updated_at = $5 WHERE id = $6",
		user.Username, user.PasswordHash, user.ForcePasswordChange, avatarURL, time.Now(), user.ID)
	if err != nil {
		return fmt.Errorf("updating user: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("getting rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return ErrNotFound
	}
	return nil
}
