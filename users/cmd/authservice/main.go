package main

import (
	"log"
	"net/http"

	"users/internal/api/handler"
	"users/internal/api/middleware"
	"users/internal/auth"
	"users/internal/config"
	"users/internal/database"
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
	refreshStore := auth.NewRefreshTokenStore(db)

	authHandler := handler.NewAuthHandler(handler.AuthHandlerConfig{
		UserStore:       userStore,
		RefreshStore:    refreshStore,
		JWTSecret:       []byte(cfg.JWTSecret),
		AccessTokenTTL:  cfg.AccessTokenTTL,
		RefreshTokenTTL: cfg.RefreshTokenTTL,
	})

	userHandler := handler.NewUserHandler(handler.UserHandlerConfig{
		UserStore: userStore,
	})

	mux := http.NewServeMux()

	// Public auth routes
	mux.HandleFunc("POST /v1/auth/login", authHandler.Login)
	mux.HandleFunc("POST /v1/auth/refresh", authHandler.Refresh)

	// Protected user routes
	auth := middleware.Auth([]byte(cfg.JWTSecret))
	admin := middleware.Admin

	mux.Handle("GET /v1/users", auth(admin(http.HandlerFunc(userHandler.ListUsers))))
	mux.Handle("GET /v1/users/{id}", auth(http.HandlerFunc(userHandler.GetUser)))
	mux.Handle("POST /v1/users", auth(admin(http.HandlerFunc(userHandler.CreateUser))))
	mux.Handle("PUT /v1/users/{id}", auth(http.HandlerFunc(userHandler.UpdateUser)))
	mux.Handle("PUT /v1/users/{id}/password", auth(http.HandlerFunc(userHandler.ChangePassword)))

	log.Printf("Server listening on :%s", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, mux); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
