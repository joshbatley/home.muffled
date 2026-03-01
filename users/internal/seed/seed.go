// Package seed handles seeding initial data on application startup.
package seed

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"users/internal/auth"
	"users/internal/role"
	"users/internal/user"
)

// SeedAdmin creates the initial admin user if it doesn't already exist.
func SeedAdmin(ctx context.Context, userStore user.Store, username, password string) error {
	_, err := userStore.GetByUsername(ctx, username)
	if err == nil {
		return nil
	}
	if !errors.Is(err, user.ErrNotFound) {
		return fmt.Errorf("checking for existing user: %w", err)
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hashing password: %w", err)
	}

	u := &user.User{
		ID:                  uuid.New(),
		Username:            username,
		PasswordHash:        hash,
		ForcePasswordChange: false,
	}

	if err := userStore.Create(ctx, u); err != nil {
		return fmt.Errorf("creating seed user: %w", err)
	}

	return nil
}

// SeedAdminWithRole creates the initial admin user and assigns the admin role.
func SeedAdminWithRole(ctx context.Context, userStore user.Store, roleStore role.Store, username, password string) error {
	// Check if user already exists
	existingUser, err := userStore.GetByUsername(ctx, username)
	if err != nil && !errors.Is(err, user.ErrNotFound) {
		return fmt.Errorf("checking for existing user: %w", err)
	}

	var u *user.User
	if existingUser != nil {
		u = existingUser
	} else {
		hash, err := auth.HashPassword(password)
		if err != nil {
			return fmt.Errorf("hashing password: %w", err)
		}

		u = &user.User{
			ID:                  uuid.New(),
			Username:            username,
			PasswordHash:        hash,
			ForcePasswordChange: false,
		}

		if err := userStore.Create(ctx, u); err != nil {
			return fmt.Errorf("creating seed user: %w", err)
		}
	}

	// Create or get admin role
	r, err := roleStore.GetRoleByName(ctx, "admin")
	if errors.Is(err, role.ErrNotFound) {
		r, err = roleStore.CreateRole(ctx, "admin")
		if err != nil {
			return fmt.Errorf("creating admin role: %w", err)
		}
	} else if err != nil {
		return fmt.Errorf("getting admin role: %w", err)
	}

	// Assign role to user
	if err := roleStore.AssignRoleToUser(ctx, u.ID, r.ID); err != nil {
		return fmt.Errorf("assigning admin role: %w", err)
	}

	return nil
}
