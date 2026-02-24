package main

import (
	"log"
	"os"

	"users/internal/config"
	"users/internal/database"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatal("usage: migrate <up|down>")
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer db.Close()

	switch os.Args[1] {
	case "up":
		if err := database.MigrateUp(db, "migrations"); err != nil {
			log.Fatalf("migration up failed: %v", err)
		}
		log.Println("Migrations applied successfully")
	case "down":
		if err := database.MigrateDown(db, "migrations"); err != nil {
			log.Fatalf("migration down failed: %v", err)
		}
		log.Println("Migration rolled back successfully")
	default:
		log.Fatalf("unknown command: %s (use 'up' or 'down')", os.Args[1])
	}
}
