package seed

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"users2/internal/auth"
	"users2/internal/role"
	"users2/internal/user"
)

const (
	PermIntranetRead  = "intranet:read"
	PermIntranetWrite = "intranet:write"
	PermUsersAdmin    = "users:admin"
	RoleAdmin         = "admin"
	RoleUser          = "user"
	RoleReadonly      = "readonly"
)

func SeedDefaults(ctx context.Context, permStore role.PermissionStore, roleStore role.Store) error {
	keys := []struct {
		key, desc string
	}{
		{PermIntranetRead, "Read intranet resources"},
		{PermIntranetWrite, "Write intranet resources"},
		{PermUsersAdmin, "Manage users, roles, and permissions"},
	}

	permIDs := make(map[string]uuid.UUID)
	for _, k := range keys {
		p, err := permStore.GetByKey(ctx, k.key)
		if err == nil && p != nil {
			permIDs[k.key] = p.ID
			continue
		}
		if err != nil && !errors.Is(err, role.ErrPermissionNotFound) {
			return fmt.Errorf("permission %s: %w", k.key, err)
		}
		created, err := permStore.Create(ctx, k.key, k.desc)
		if err != nil {
			if errors.Is(err, role.ErrDuplicatePermission) {
				p2, e2 := permStore.GetByKey(ctx, k.key)
				if e2 != nil {
					return e2
				}
				permIDs[k.key] = p2.ID
				continue
			}
			return fmt.Errorf("create permission %s: %w", k.key, err)
		}
		permIDs[k.key] = created.ID
	}

	roles := []struct {
		name string
		keys []string
	}{
		{RoleAdmin, []string{PermIntranetRead, PermIntranetWrite, PermUsersAdmin}},
		{RoleUser, []string{PermIntranetRead, PermIntranetWrite}},
		{RoleReadonly, []string{PermIntranetRead}},
	}

	for _, rs := range roles {
		r, err := roleStore.GetRoleByName(ctx, rs.name)
		if err != nil && !errors.Is(err, role.ErrNotFound) {
			return err
		}
		if errors.Is(err, role.ErrNotFound) {
			r, err = roleStore.CreateRole(ctx, rs.name)
			if err != nil {
				return fmt.Errorf("create role %s: %w", rs.name, err)
			}
		}
		for _, pk := range rs.keys {
			pid := permIDs[pk]
			if err := roleStore.AssignPermission(ctx, r.ID, pid); err != nil {
				return fmt.Errorf("assign %s to %s: %w", pk, rs.name, err)
			}
		}
	}

	return nil
}

func SeedAdmin(ctx context.Context, userStore user.Store, roleStore role.Store, email, password string) error {
	existing, err := userStore.GetByEmail(ctx, email)
	if err != nil && !errors.Is(err, user.ErrNotFound) {
		return fmt.Errorf("checking seed user: %w", err)
	}

	var u *user.User
	if existing != nil {
		u = existing
	} else {
		hash, err := auth.HashPassword(password)
		if err != nil {
			return fmt.Errorf("hash password: %w", err)
		}
		u = &user.User{
			ID:                  uuid.New(),
			Email:               email,
			PasswordHash:        hash,
			ForcePasswordChange: false,
		}
		if err := userStore.Create(ctx, u); err != nil {
			return fmt.Errorf("create seed user: %w", err)
		}
	}

	adminRole, err := roleStore.GetRoleByName(ctx, RoleAdmin)
	if err != nil {
		return fmt.Errorf("admin role: %w", err)
	}
	if err := roleStore.AssignRoleToUser(ctx, u.ID, adminRole.ID); err != nil {
		return fmt.Errorf("assign admin role: %w", err)
	}

	return nil
}
