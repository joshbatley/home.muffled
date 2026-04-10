package main

import (
	"context"
	"database/sql"
	"flag"
	"log"
	"net/http"

	"users2/internal/auth"
	"users2/internal/config"
	"users2/internal/database"
	"users2/internal/httpapi"
	"users2/internal/httpapi/middleware"
	"users2/internal/mail"
	"users2/internal/role"
	"users2/internal/seed"
	"users2/internal/user"
	migrations "users2/migrations"
)

func main() {
	seedOnly := flag.Bool("seed-admin", false, "run migrations, seed roles/permissions and admin, then exit")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}
	cfg.Log()

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer db.Close()

	if err := database.MigrateUp(db, migrations.FS); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	permStore := role.NewPostgresPermissionStore(db)
	roleStore := role.NewPostgresStore(db)
	if err := seed.SeedDefaults(context.Background(), permStore, roleStore); err != nil {
		log.Fatalf("seed defaults: %v", err)
	}

	userStore := user.NewPostgresStore(db)
	if err := seed.SeedAdmin(context.Background(), userStore, roleStore, cfg.SeedEmail, cfg.SeedPassword); err != nil {
		log.Fatalf("seed admin: %v", err)
	}

	if *seedOnly {
		log.Println("seed complete")
		return
	}

	h := routes(db, cfg, userStore, roleStore, permStore)
	log.Printf("listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, h); err != nil {
		log.Fatal(err)
	}
}

func routes(
	db *sql.DB,
	cfg *config.Config,
	userStore user.Store,
	roleStore *role.PostgresStore,
	permStore *role.PostgresPermissionStore,
) http.Handler {
	refreshStore := auth.NewRefreshTokenStore(db)
	resetStore := auth.NewPasswordResetStore(db)

	authHandler := httpapi.NewAuthHandler(httpapi.AuthHandlerConfig{
		UserStore:       userStore,
		RefreshStore:    refreshStore,
		RoleStore:       roleStore,
		JWTSecret:       []byte(cfg.JWTSecret),
		AccessTokenTTL:  cfg.AccessTokenTTL,
		RefreshTokenTTL: cfg.RefreshTokenTTL,
	})

	var mailSender *mail.Sender
	if cfg.MailConfigured() {
		mailSender = mail.NewSender(mail.Config{
			Host: cfg.SMTPHost, Port: cfg.SMTPPort, User: cfg.SMTPUser,
			Password: cfg.SMTPPassword, From: cfg.MailFrom,
		})
	}

	userHandler := httpapi.NewUserHandler(httpapi.UserHandlerConfig{
		UserStore:           userStore,
		RoleStore:           roleStore,
		WelcomeMailer:       mailSender,
		PublicBaseURL:       cfg.PublicBaseURL,
		IntranetDisplayName: "home.muffled intranet",
	})

	adminHandler := httpapi.NewAdminHandler(httpapi.AdminHandlerConfig{
		RoleStore:       roleStore,
		PermissionStore: permStore,
	})

	authzHandler := httpapi.NewAuthzHandler(httpapi.AuthzHandlerConfig{RoleStore: roleStore})
	healthHandler := &httpapi.Health{DB: db}

	resetDeps := httpapi.PasswordResetDeps{
		UserStore:     userStore,
		ResetStore:    resetStore,
		Mailer:        mailSender,
		PublicBaseURL: cfg.PublicBaseURL,
		ResetTTL:      cfg.PasswordResetTTL,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /v1/health", healthHandler.Heartbeat)
	mux.HandleFunc("GET /v1/health/ready", healthHandler.Ready)

	mux.HandleFunc("POST /v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /v1/auth/refresh", authHandler.Refresh)
	mux.HandleFunc("POST /v1/auth/logout", authHandler.Logout)
	mux.HandleFunc("POST /v1/auth/forgot-password", httpapi.ForgotPassword(resetDeps))
	mux.HandleFunc("POST /v1/auth/reset-password", httpapi.ResetPassword(resetDeps))

	authMW := middleware.Auth([]byte(cfg.JWTSecret))
	adminMW := middleware.Admin
	forceMW := middleware.ForcePasswordChange

	mux.Handle("GET /v1/auth/validate", authMW(http.HandlerFunc(authHandler.Validate)))

	mux.Handle("GET /v1/me", authMW(forceMW(http.HandlerFunc(userHandler.Me))))
	mux.Handle("GET /v1/users", authMW(forceMW(adminMW(http.HandlerFunc(userHandler.ListUsers)))))
	mux.Handle("GET /v1/users/{id}", authMW(forceMW(http.HandlerFunc(userHandler.GetUser))))
	mux.Handle("POST /v1/users", authMW(forceMW(adminMW(http.HandlerFunc(userHandler.CreateUser)))))
	mux.Handle("PUT /v1/users/{id}", authMW(forceMW(http.HandlerFunc(userHandler.UpdateUser))))
	mux.Handle("PUT /v1/users/{id}/password", authMW(forceMW(http.HandlerFunc(userHandler.ChangePassword))))

	mux.Handle("POST /v1/roles", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.CreateRole)))))
	mux.Handle("GET /v1/roles", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.ListRoles)))))
	mux.Handle("DELETE /v1/roles/{id}", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.DeleteRole)))))
	mux.Handle("POST /v1/roles/{id}/permissions", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.AssignPermissionsToRole)))))
	mux.Handle("DELETE /v1/roles/{id}/permissions/{permId}", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.RemovePermissionFromRole)))))

	mux.Handle("POST /v1/permissions", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.CreatePermission)))))
	mux.Handle("GET /v1/permissions", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.ListPermissions)))))
	mux.Handle("DELETE /v1/permissions/{id}", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.DeletePermission)))))

	mux.Handle("POST /v1/users/{id}/roles", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.AssignRolesToUser)))))
	mux.Handle("DELETE /v1/users/{id}/roles/{roleId}", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.RemoveRoleFromUser)))))
	mux.Handle("POST /v1/users/{id}/permissions", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.GrantPermissionsToUser)))))
	mux.Handle("DELETE /v1/users/{id}/permissions/{permId}", authMW(forceMW(adminMW(http.HandlerFunc(adminHandler.RevokePermissionFromUser)))))

	mux.Handle("POST /v1/authz/check", authMW(forceMW(http.HandlerFunc(authzHandler.Check))))

	var h http.Handler = mux
	if len(cfg.CORSOrigins) > 0 {
		h = middleware.CORS(cfg.CORSOrigins)(mux)
	}
	return h
}
