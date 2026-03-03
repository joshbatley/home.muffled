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

// ErrNotFound is returned when a role or permission is not found.
var ErrNotFound = errors.New("role not found")

// ErrDuplicateRole is returned when creating a role that already exists.
var ErrDuplicateRole = errors.New("role already exists")

// PermissionNotFound is returned when a permission is not found.
var PermissionNotFound = errors.New("permission not found")

// ErrDuplicatePermission is returned when creating a permission that already exists.
var ErrDuplicatePermission = errors.New("permission key already exists")

// Role represents a role in the system.
type Role struct {
	ID        uuid.UUID
	Name      string
	CreatedAt time.Time
}

// Permission represents a permission in the system (e.g. "service:resource.verb").
type Permission struct {
	ID          uuid.UUID
	Key         string
	Description string
	CreatedAt   time.Time
}

// Store defines the interface for role persistence (RoleStore).
type Store interface {
	CreateRole(ctx context.Context, name string) (*Role, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Role, error)
	GetRoleByName(ctx context.Context, name string) (*Role, error)
	List(ctx context.Context) ([]Role, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
	GetUserRoles(ctx context.Context, userID uuid.UUID) ([]Role, error)
}

// PermissionStore defines the interface for permission persistence.
type PermissionStore interface {
	Create(ctx context.Context, key, description string) (*Permission, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Permission, error)
	GetByKey(ctx context.Context, key string) (*Permission, error)
	List(ctx context.Context) ([]Permission, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// UserRoleStore defines the interface for user-role and user-permission lookups.
type UserRoleStore interface {
	AssignRole(ctx context.Context, userID, roleID uuid.UUID) error
	RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error
	GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]Role, error)
	GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]Permission, error)
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
	existing, err := s.GetRoleByName(ctx, name)
	if err == nil && existing != nil {
		return nil, ErrDuplicateRole
	}
	var r Role
	err = s.db.QueryRowContext(ctx,
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

// GetByID retrieves a role by ID.
func (s *PostgresStore) GetByID(ctx context.Context, id uuid.UUID) (*Role, error) {
	var r Role
	err := s.db.QueryRowContext(ctx,
		"SELECT id, name, created_at FROM roles WHERE id = $1",
		id).Scan(&r.ID, &r.Name, &r.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting role by id: %w", err)
	}
	return &r, nil
}

// List returns all roles.
func (s *PostgresStore) List(ctx context.Context) ([]Role, error) {
	rows, err := s.db.QueryContext(ctx,
		"SELECT id, name, created_at FROM roles ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("listing roles: %w", err)
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

// Delete removes a role by ID.
func (s *PostgresStore) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := s.db.ExecContext(ctx, "DELETE FROM roles WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("deleting role: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("deleting role: %w", err)
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// AssignPermission assigns a permission to a role.
func (s *PostgresStore) AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		"INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
		roleID, permissionID)
	if err != nil {
		return fmt.Errorf("assigning permission to role: %w", err)
	}
	return nil
}

// RemovePermission removes a permission from a role.
func (s *PostgresStore) RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	result, err := s.db.ExecContext(ctx,
		"DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2",
		roleID, permissionID)
	if err != nil {
		return fmt.Errorf("removing permission from role: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
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

// RemoveRole removes a role from a user.
func (s *PostgresStore) RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error {
	result, err := s.db.ExecContext(ctx,
		"DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2",
		userID, roleID)
	if err != nil {
		return fmt.Errorf("removing role from user: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

// GetPermissionsByUserID returns all permissions for a user (inherited from their roles).
func (s *PostgresStore) GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]Permission, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT DISTINCT p.id, p.key, p.description, p.created_at
		 FROM permissions p
		 JOIN role_permissions rp ON p.id = rp.permission_id
		 JOIN user_roles ur ON rp.role_id = ur.role_id
		 WHERE ur.user_id = $1
		 ORDER BY p.key`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("getting user permissions: %w", err)
	}
	defer rows.Close()

	var perms []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning permission: %w", err)
		}
		perms = append(perms, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating permissions: %w", err)
	}
	return perms, nil
}

// AssignRole assigns a role to a user (UserRoleStore).
func (s *PostgresStore) AssignRole(ctx context.Context, userID, roleID uuid.UUID) error {
	return s.AssignRoleToUser(ctx, userID, roleID)
}

// GetRolesByUserID returns all roles for a user (UserRoleStore).
func (s *PostgresStore) GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]Role, error) {
	return s.GetUserRoles(ctx, userID)
}

// PostgresPermissionStore implements PermissionStore using PostgreSQL.
type PostgresPermissionStore struct {
	db *sql.DB
}

// NewPostgresPermissionStore creates a new PostgresPermissionStore.
func NewPostgresPermissionStore(db *sql.DB) *PostgresPermissionStore {
	return &PostgresPermissionStore{db: db}
}

// Create creates a new permission.
func (s *PostgresPermissionStore) Create(ctx context.Context, key, description string) (*Permission, error) {
	existing, err := s.GetByKey(ctx, key)
	if err == nil && existing != nil {
		return nil, ErrDuplicatePermission
	}
	var p Permission
	err = s.db.QueryRowContext(ctx,
		"INSERT INTO permissions (key, description) VALUES ($1, $2) RETURNING id, key, description, created_at",
		key, description).Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("creating permission: %w", err)
	}
	return &p, nil
}

// GetByID retrieves a permission by ID.
func (s *PostgresPermissionStore) GetByID(ctx context.Context, id uuid.UUID) (*Permission, error) {
	var p Permission
	err := s.db.QueryRowContext(ctx,
		"SELECT id, key, description, created_at FROM permissions WHERE id = $1",
		id).Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, PermissionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting permission by id: %w", err)
	}
	return &p, nil
}

// GetByKey retrieves a permission by key.
func (s *PostgresPermissionStore) GetByKey(ctx context.Context, key string) (*Permission, error) {
	var p Permission
	err := s.db.QueryRowContext(ctx,
		"SELECT id, key, description, created_at FROM permissions WHERE key = $1",
		key).Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, PermissionNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting permission by key: %w", err)
	}
	return &p, nil
}

// List returns all permissions.
func (s *PostgresPermissionStore) List(ctx context.Context) ([]Permission, error) {
	rows, err := s.db.QueryContext(ctx,
		"SELECT id, key, description, created_at FROM permissions ORDER BY key")
	if err != nil {
		return nil, fmt.Errorf("listing permissions: %w", err)
	}
	defer rows.Close()

	var perms []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning permission: %w", err)
		}
		perms = append(perms, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating permissions: %w", err)
	}
	return perms, nil
}

// Delete removes a permission by ID.
func (s *PostgresPermissionStore) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := s.db.ExecContext(ctx, "DELETE FROM permissions WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("deleting permission: %w", err)
	}
	n, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("deleting permission: %w", err)
	}
	if n == 0 {
		return PermissionNotFound
	}
	return nil
}
