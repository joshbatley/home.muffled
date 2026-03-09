package main

import (
	"database/sql"
	"log"
	"net/http"

	"users/internal/api/handler"
	"users/internal/api/middleware"
	"users/internal/auth"
	"users/internal/config"
	"users/internal/role"
	"users/internal/user"
)

// App holds the database and config used to build routes and serve.
type App struct {
	DB  *sql.DB
	Cfg *config.Config
}

// routes builds stores, handlers, and the HTTP mux with middleware.
func (app *App) routes() http.Handler {
	userStore := user.NewPostgresStore(app.DB)
	roleStore := role.NewPostgresStore(app.DB)
	permissionStore := role.NewPostgresPermissionStore(app.DB)
	refreshStore := auth.NewRefreshTokenStore(app.DB)

	authHandler := handler.NewAuthHandler(handler.AuthHandlerConfig{
		UserStore:       userStore,
		RefreshStore:    refreshStore,
		RoleStore:       roleStore,
		JWTSecret:       []byte(app.Cfg.JWTSecret),
		AccessTokenTTL:  app.Cfg.AccessTokenTTL,
		RefreshTokenTTL: app.Cfg.RefreshTokenTTL,
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

	healthHandler := &handler.Health{DB: app.DB}

	mux := http.NewServeMux()

	// Health (no auth)
	mux.HandleFunc("GET /v1/health", healthHandler.Heartbeat)
	mux.HandleFunc("GET /v1/health/ready", healthHandler.Ready)

	// Public auth routes
	mux.HandleFunc("POST /v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /v1/auth/refresh", authHandler.Refresh)
	mux.HandleFunc("POST /v1/auth/logout", authHandler.Logout)

	// Middleware
	authMiddleware := middleware.Auth([]byte(app.Cfg.JWTSecret))
	admin := middleware.Admin
	forcePasswordChange := middleware.ForcePasswordChange

	// Protected user routes
	mux.Handle("GET /v1/me", authMiddleware(forcePasswordChange(http.HandlerFunc(userHandler.Me))))
	mux.Handle("GET /v1/users", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(userHandler.ListUsers)))))
	mux.Handle("GET /v1/users/{id}", authMiddleware(forcePasswordChange(http.HandlerFunc(userHandler.GetUser))))
	mux.Handle("POST /v1/users", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(userHandler.CreateUser)))))
	mux.Handle("PUT /v1/users/{id}", authMiddleware(forcePasswordChange(http.HandlerFunc(userHandler.UpdateUser))))
	mux.Handle("PUT /v1/users/{id}/password", authMiddleware(forcePasswordChange(http.HandlerFunc(userHandler.ChangePassword))))

	// Admin: roles
	mux.Handle("POST /v1/roles", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.CreateRole)))))
	mux.Handle("GET /v1/roles", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.ListRoles)))))
	mux.Handle("DELETE /v1/roles/{id}", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.DeleteRole)))))
	mux.Handle("POST /v1/roles/{id}/permissions", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.AssignPermissionsToRole)))))
	mux.Handle("DELETE /v1/roles/{id}/permissions/{permId}", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.RemovePermissionFromRole)))))

	// Admin: permissions
	mux.Handle("POST /v1/permissions", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.CreatePermission)))))
	mux.Handle("GET /v1/permissions", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.ListPermissions)))))
	mux.Handle("DELETE /v1/permissions/{id}", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.DeletePermission)))))

	// Admin: user role assignment
	mux.Handle("POST /v1/users/{id}/roles", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.AssignRolesToUser)))))
	mux.Handle("DELETE /v1/users/{id}/roles/{roleId}", authMiddleware(forcePasswordChange(admin(http.HandlerFunc(adminHandler.RemoveRoleFromUser)))))

	// Authz check (authenticated)
	mux.Handle("POST /v1/authz/check", authMiddleware(forcePasswordChange(http.HandlerFunc(authzHandler.Check))))

	var h http.Handler = mux
	if len(app.Cfg.CORSOrigins) > 0 {
		h = middleware.CORS(app.Cfg.CORSOrigins)(mux)
	}

	return h
}

// Serve starts the HTTP server with the app's routes and middleware.
func (app *App) Serve() error {
	h := app.routes()
	log.Printf("Server listening on :%s", app.Cfg.Port)
	return http.ListenAndServe(":"+app.Cfg.Port, h)
}
