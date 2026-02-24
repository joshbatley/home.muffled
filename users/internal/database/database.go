// Package database handles PostgreSQL connections and migrations.
package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	_ "github.com/lib/pq"
)

// Connect establishes a connection to the PostgreSQL database.
func Connect(databaseURL string) (*sql.DB, error) {
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("connecting to database: %w", err)
	}

	return db, nil
}

// MigrateUp applies all pending up migrations from the given directory.
func MigrateUp(db *sql.DB, migrationsDir string) error {
	if err := ensureMigrationsTable(db); err != nil {
		return err
	}

	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.up.sql"))
	if err != nil {
		return fmt.Errorf("reading migrations: %w", err)
	}
	sort.Strings(files)

	for _, file := range files {
		name := filepath.Base(file)
		applied, err := isMigrationApplied(db, name)
		if err != nil {
			return err
		}
		if applied {
			log.Printf("Skipping migration: %s (already applied)", name)
			continue
		}

		content, err := os.ReadFile(file)
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", name, err)
		}

		log.Printf("Applying migration: %s", name)
		if _, err := db.Exec(string(content)); err != nil {
			return fmt.Errorf("applying migration %s: %w", name, err)
		}

		if err := recordMigration(db, name); err != nil {
			return err
		}
	}

	return nil
}

// MigrateDown rolls back the last applied migration.
func MigrateDown(db *sql.DB, migrationsDir string) error {
	if err := ensureMigrationsTable(db); err != nil {
		return err
	}

	lastMigration, err := getLastMigration(db)
	if err != nil {
		return err
	}
	if lastMigration == "" {
		log.Println("No migrations to roll back")
		return nil
	}

	downFile := strings.Replace(lastMigration, ".up.sql", ".down.sql", 1)
	downPath := filepath.Join(migrationsDir, downFile)

	content, err := os.ReadFile(downPath)
	if err != nil {
		return fmt.Errorf("reading down migration %s: %w", downFile, err)
	}

	log.Printf("Rolling back migration: %s", lastMigration)
	if _, err := db.Exec(string(content)); err != nil {
		return fmt.Errorf("rolling back migration %s: %w", lastMigration, err)
	}

	if err := removeMigration(db, lastMigration); err != nil {
		return err
	}

	return nil
}

func ensureMigrationsTable(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS migrations (
			name VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("creating migrations table: %w", err)
	}
	return nil
}

func isMigrationApplied(db *sql.DB, name string) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM migrations WHERE name = $1", name).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("checking migration %s: %w", name, err)
	}
	return count > 0, nil
}

func recordMigration(db *sql.DB, name string) error {
	_, err := db.Exec("INSERT INTO migrations (name) VALUES ($1)", name)
	if err != nil {
		return fmt.Errorf("recording migration %s: %w", name, err)
	}
	return nil
}

func getLastMigration(db *sql.DB) (string, error) {
	var name string
	err := db.QueryRow("SELECT name FROM migrations ORDER BY applied_at DESC LIMIT 1").Scan(&name)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("getting last migration: %w", err)
	}
	return name, nil
}

func removeMigration(db *sql.DB, name string) error {
	_, err := db.Exec("DELETE FROM migrations WHERE name = $1", name)
	if err != nil {
		return fmt.Errorf("removing migration %s: %w", name, err)
	}
	return nil
}
