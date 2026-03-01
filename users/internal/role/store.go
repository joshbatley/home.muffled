// Package role handles role and permission management.
package role

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ErrNotFound is returned when a role is not found.
var ErrNotFound = errors.New("role not found")

// Role represents a role in the system.
type Role struct {
	ID        uuid.UUID
	Name      string
	CreatedAt time.Time
}

// Store defines the interface for role persistence.
type Store interface {
	CreateRole(ctx context.Context, name string) (*Role, error)
	GetRoleByName(ctx context.Context, name string) (*Role, error)
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]Role, error)
}

// PostgresStore implements Store using PostgreSQL.
type PostgresStore struct {
	db *sql.DB
}

// NewPostgresStore creates a new PostgresStore.
func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

// CreateRole creates a new role.
func (s *PostgresStore) CreateRole(ctx context.Context, name string) (*Role, error) {
	var r Role
	err := s.db.QueryRowContext(ctx,
		"INSERT INTO roles (name) VALUES ($1) RETURNING id, name, created_at",
		name).Scan(&r.ID, &r.Name, &r.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating role: %w", err)
	}
	return &r, nil
}

// GetRoleByName retrieves a role by name.
func (s *PostgresStore) GetRoleByName(ctx context.Context, name string) (*Role, error) {
	var r Role
	err := s.db.QueryRowContext(ctx,
		"SELECT id, name, created_at FROM roles WHERE name = $1",
		name).Scan(&r.ID, &r.Name, &r.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting role by name: %w", err)
	}
	return &r, nil
}

// AssignRoleToUser assigns a role to a user.
func (s *PostgresStore) AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		userID, roleID)
	if err != nil {
		return fmt.Errorf("assigning role to user: %w", err)
	}
	return nil
}

// GetUserRoles retrieves all roles for a user.
func (s *PostgresStore) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]Role, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT r.id, r.name, r.created_at 
		 FROM roles r 
		 JOIN user_roles ur ON r.id = ur.role_id 
		 WHERE ur.user_id = $1`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("getting user roles: %w", err)
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Name, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning role: %w", err)
		}
		roles = append(roles, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating roles: %w", err)
	}
	return roles, nil
}
