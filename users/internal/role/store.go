package role

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sort"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Store interface {
	CreateRole(ctx context.Context, name string) (*Role, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Role, error)
	GetRoleByName(ctx context.Context, name string) (*Role, error)
	List(ctx context.Context) ([]Role, error)
	Delete(ctx context.Context, id uuid.UUID) error
	AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error
	AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error
	RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error
	GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]Role, error)
	GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]Permission, error)
	GrantPermissionToUser(ctx context.Context, userID, permissionID uuid.UUID) error
	RevokePermissionFromUser(ctx context.Context, userID, permissionID uuid.UUID) error
}

type PermissionStore interface {
	Create(ctx context.Context, key, description string) (*Permission, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Permission, error)
	GetByKey(ctx context.Context, key string) (*Permission, error)
	List(ctx context.Context) ([]Permission, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(db *sql.DB) *PostgresStore {
	return &PostgresStore{db: db}
}

func (s *PostgresStore) CreateRole(ctx context.Context, name string) (*Role, error) {
	var r Role
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO roles (name) VALUES ($1) RETURNING id, name, created_at`,
		name).Scan(&r.ID, &r.Name, &r.CreatedAt)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, ErrDuplicateRole
		}
		return nil, fmt.Errorf("creating role: %w", err)
	}
	return &r, nil
}

func (s *PostgresStore) GetRoleByName(ctx context.Context, name string) (*Role, error) {
	var r Role
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, created_at FROM roles WHERE name = $1`,
		name).Scan(&r.ID, &r.Name, &r.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting role by name: %w", err)
	}
	return &r, nil
}

func (s *PostgresStore) GetByID(ctx context.Context, id uuid.UUID) (*Role, error) {
	var r Role
	err := s.db.QueryRowContext(ctx,
		`SELECT id, name, created_at FROM roles WHERE id = $1`,
		id).Scan(&r.ID, &r.Name, &r.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("getting role: %w", err)
	}
	return &r, nil
}

func (s *PostgresStore) List(ctx context.Context) ([]Role, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, name, created_at FROM roles ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("listing roles: %w", err)
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Name, &r.CreatedAt); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, rows.Err()
}

func (s *PostgresStore) Delete(ctx context.Context, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM roles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) AssignPermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		roleID, permissionID)
	return err
}

func (s *PostgresStore) RemovePermission(ctx context.Context, roleID, permissionID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2`,
		roleID, permissionID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) AssignRoleToUser(ctx context.Context, userID, roleID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, roleID)
	return err
}

func (s *PostgresStore) RemoveRole(ctx context.Context, userID, roleID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`,
		userID, roleID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *PostgresStore) GetRolesByUserID(ctx context.Context, userID uuid.UUID) ([]Role, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT r.id, r.name, r.created_at FROM roles r
		 JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1 ORDER BY r.name`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("getting user roles: %w", err)
	}
	defer rows.Close()

	var roles []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Name, &r.CreatedAt); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	return roles, rows.Err()
}

func (s *PostgresStore) GetPermissionsByUserID(ctx context.Context, userID uuid.UUID) ([]Permission, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, key, description, created_at FROM (
			SELECT DISTINCT p.id, p.key, p.description, p.created_at
			FROM permissions p
			JOIN role_permissions rp ON p.id = rp.permission_id
			JOIN user_roles ur ON rp.role_id = ur.role_id
			WHERE ur.user_id = $1
			UNION
			SELECT DISTINCT p.id, p.key, p.description, p.created_at
			FROM permissions p
			JOIN user_permission_grants ug ON p.id = ug.permission_id
			WHERE ug.user_id = $1
		) x ORDER BY key`,
		userID)
	if err != nil {
		return nil, fmt.Errorf("getting user permissions: %w", err)
	}
	defer rows.Close()

	var perms []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, rows.Err()
}

func (s *PostgresStore) GrantPermissionToUser(ctx context.Context, userID, permissionID uuid.UUID) error {
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO user_permission_grants (user_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		userID, permissionID)
	return err
}

func (s *PostgresStore) RevokePermissionFromUser(ctx context.Context, userID, permissionID uuid.UUID) error {
	res, err := s.db.ExecContext(ctx,
		`DELETE FROM user_permission_grants WHERE user_id = $1 AND permission_id = $2`,
		userID, permissionID)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

type PostgresPermissionStore struct {
	db *sql.DB
}

func NewPostgresPermissionStore(db *sql.DB) *PostgresPermissionStore {
	return &PostgresPermissionStore{db: db}
}

func (s *PostgresPermissionStore) Create(ctx context.Context, key, description string) (*Permission, error) {
	var p Permission
	err := s.db.QueryRowContext(ctx,
		`INSERT INTO permissions (key, description) VALUES ($1, $2) RETURNING id, key, description, created_at`,
		key, description).Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" {
			return nil, ErrDuplicatePermission
		}
		return nil, fmt.Errorf("creating permission: %w", err)
	}
	return &p, nil
}

func (s *PostgresPermissionStore) GetByID(ctx context.Context, id uuid.UUID) (*Permission, error) {
	var p Permission
	err := s.db.QueryRowContext(ctx,
		`SELECT id, key, description, created_at FROM permissions WHERE id = $1`,
		id).Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPermissionNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *PostgresPermissionStore) GetByKey(ctx context.Context, key string) (*Permission, error) {
	var p Permission
	err := s.db.QueryRowContext(ctx,
		`SELECT id, key, description, created_at FROM permissions WHERE key = $1`,
		key).Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrPermissionNotFound
	}
	if err != nil {
		return nil, err
	}
	return &p, nil
}

func (s *PostgresPermissionStore) List(ctx context.Context) ([]Permission, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT id, key, description, created_at FROM permissions ORDER BY key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var perms []Permission
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Key, &p.Description, &p.CreatedAt); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, rows.Err()
}

func (s *PostgresPermissionStore) Delete(ctx context.Context, id uuid.UUID) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM permissions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return ErrPermissionNotFound
	}
	return nil
}

func PermissionKeys(perms []Permission) []string {
	keys := make([]string, len(perms))
	for i := range perms {
		keys[i] = perms[i].Key
	}
	sort.Strings(keys)
	return keys
}

func RoleNames(roles []Role) []string {
	names := make([]string, len(roles))
	for i := range roles {
		names[i] = roles[i].Name
	}
	sort.Strings(names)
	return names
}
