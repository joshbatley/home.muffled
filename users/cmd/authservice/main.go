package main

import (
	"context"
	"flag"
	"log"

	"users/internal/config"
	"users/internal/database"
	"users/internal/role"
	"users/internal/seed"
	"users/internal/user"
)

func main() {
	seedAdmin := flag.Bool("seed-admin", false, "seed the admin user and then exit")
	flag.Parse()

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

	if *seedAdmin {
		userStore := user.NewPostgresStore(db)
		roleStore := role.NewPostgresStore(db)
		if err := seed.SeedAdminWithRole(context.Background(), userStore, roleStore, cfg.SeedUsername, cfg.SeedPassword); err != nil {
			log.Fatalf("failed to seed admin: %v", err)
		}
		log.Printf("Admin user seeded: %s", cfg.SeedUsername)
		return
	}

	app := &App{DB: db, Cfg: cfg}
	if err := app.Serve(); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}
