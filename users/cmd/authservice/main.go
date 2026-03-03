package main

import (
	"context"
	"log"
	"net/http"

	"users/internal/api/handler"
	"users/internal/api/middleware"
	"users/internal/auth"
	"users/internal/config"
	"users/internal/database"
	"users/internal/role"
	"users/internal/seed"
	"users/internal/user"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}
	cfg.Log()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	userStore := user.NewPostgresStore(db)
	roleStore := role.NewPostgresStore(db)
	permissionStore := role.NewPostgresPermissionStore(db)
	refreshStore := auth.NewRefreshTokenStore(db)

	// Seed admin user
	if err := seed.SeedAdminWithRole(context.Background(), userStore, roleStore, cfg.SeedUsername, cfg.SeedPassword); err != nil {
		log.Fatalf("failed to seed admin: %v", err)
	}
	log.Printf("Admin user seeded: %s", cfg.SeedUsername)

	authHandler := handler.NewAuthHandler(handler.AuthHandlerConfig{
		UserStore:       userStore,
		RefreshStore:    refreshStore,
		RoleStore:       roleStore,
		JWTSecret:       []byte(cfg.JWTSecret),
		AccessTokenTTL:  cfg.AccessTokenTTL,
		RefreshTokenTTL: cfg.RefreshTokenTTL,
	})

	userHandler := handler.NewUserHandler(handler.UserHandlerConfig{
		UserStore:          userStore,
		UserRoleStoreForMe: roleStore,
	})

	adminHandler := handler.NewAdminHandler(handler.AdminHandlerConfig{
		RoleStore:       roleStore,
		PermissionStore: permissionStore,
	})

	authzHandler := handler.NewAuthzHandler(handler.AuthzHandlerConfig{
		UserRoleStore: roleStore,
	})

	healthHandler := &handler.Health{DB: db}

	mux := http.NewServeMux()

	// Health (no auth)
	mux.HandleFunc("GET /v1/health", healthHandler.Heartbeat)
	mux.HandleFunc("GET /v1/health/ready", healthHandler.Ready)

	// Public auth routes
	mux.HandleFunc("POST /v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /v1/auth/refresh", authHandler.Refresh)
	mux.HandleFunc("POST /v1/auth/logout", authHandler.Logout)

	// Protected user routes
	auth := middleware.Auth([]byte(cfg.JWTSecret))
	admin := middleware.Admin
	forcePasswordChange := middleware.ForcePasswordChange

	mux.Handle("GET /v1/me", auth(forcePasswordChange(http.HandlerFunc(userHandler.Me))))
	mux.Handle("GET /v1/users", auth(forcePasswordChange(admin(http.HandlerFunc(userHandler.ListUsers)))))
	mux.Handle("GET /v1/users/{id}", auth(forcePasswordChange(http.HandlerFunc(userHandler.GetUser))))
	mux.Handle("POST /v1/users", auth(forcePasswordChange(admin(http.HandlerFunc(userHandler.CreateUser)))))
	mux.Handle("PUT /v1/users/{id}", auth(forcePasswordChange(http.HandlerFunc(userHandler.UpdateUser))))
	mux.Handle("PUT /v1/users/{id}/password", auth(forcePasswordChange(http.HandlerFunc(userHandler.ChangePassword))))

	// Admin: roles
	mux.Handle("POST /v1/roles", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.CreateRole)))))
	mux.Handle("GET /v1/roles", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.ListRoles)))))
	mux.Handle("DELETE /v1/roles/{id}", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.DeleteRole)))))
	mux.Handle("POST /v1/roles/{id}/permissions", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.AssignPermissionsToRole)))))
	mux.Handle("DELETE /v1/roles/{id}/permissions/{permId}", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.RemovePermissionFromRole)))))

	// Admin: permissions
	mux.Handle("POST /v1/permissions", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.CreatePermission)))))
	mux.Handle("GET /v1/permissions", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.ListPermissions)))))
	mux.Handle("DELETE /v1/permissions/{id}", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.DeletePermission)))))

	// Admin: user role assignment
	mux.Handle("POST /v1/users/{id}/roles", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.AssignRolesToUser)))))
	mux.Handle("DELETE /v1/users/{id}/roles/{roleId}", auth(forcePasswordChange(admin(http.HandlerFunc(adminHandler.RemoveRoleFromUser)))))

	// Authz check (authenticated)
	mux.Handle("POST /v1/authz/check", auth(forcePasswordChange(http.HandlerFunc(authzHandler.Check))))

	var h http.Handler = mux
	if len(cfg.CORSOrigins) > 0 {
		h = middleware.CORS(cfg.CORSOrigins)(mux)
	}

	log.Printf("Server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, h); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
