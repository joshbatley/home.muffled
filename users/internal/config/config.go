// Package config handles loading and validation of application configuration.
package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

// Config holds all application configuration.
type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	SeedUsername    string
	SeedPassword    string
	LogLevel        string
	CORSOrigins     []string // allowed origins for CORS (empty = no CORS)
}

// Load reads configuration from environment variables and validates required values.
func Load() (*Config, error) {
	accessTTL, err := parseDurationOrDefault("ACCESS_TOKEN_TTL", 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("invalid ACCESS_TOKEN_TTL: %w", err)
	}

	refreshTTL, err := parseDurationOrDefault("REFRESH_TOKEN_TTL", 7*24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("invalid REFRESH_TOKEN_TTL: %w", err)
	}

	cfg := &Config{
		Port:            getEnvOrDefault("PORT", "8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		JWTSecret:       os.Getenv("JWT_SECRET"),
		AccessTokenTTL:  accessTTL,
		RefreshTokenTTL: refreshTTL,
		SeedUsername:    os.Getenv("SEED_USERNAME"),
		SeedPassword:    os.Getenv("SEED_PASSWORD"),
		LogLevel:        getEnvOrDefault("LOG_LEVEL", "info"),
		CORSOrigins:     parseCORSOrigins(os.Getenv("CORS_ORIGINS")),
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.DatabaseURL == "" {
		return errors.New("DATABASE_URL is required")
	}
	if c.JWTSecret == "" {
		return errors.New("JWT_SECRET is required")
	}
	if c.SeedUsername == "" {
		return errors.New("SEED_USERNAME is required")
	}
	if c.SeedPassword == "" {
		return errors.New("SEED_PASSWORD is required")
	}
	return nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

// parseCORSOrigins splits CORS_ORIGINS by comma and trims spaces; empty string returns nil.
func parseCORSOrigins(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if trimmed := strings.TrimSpace(p); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}

func parseDurationOrDefault(key string, defaultValue time.Duration) (time.Duration, error) {
	v := os.Getenv(key)
	if v == "" {
		return defaultValue, nil
	}
	return time.ParseDuration(v)
}

// Log prints the configuration to the log, masking sensitive values.
func (c *Config) Log() {
	log.Printf("Config loaded:")
	log.Printf("  PORT=%s", c.Port)
	log.Printf("  ACCESS_TOKEN_TTL=%s", c.AccessTokenTTL)
	log.Printf("  REFRESH_TOKEN_TTL=%s", c.RefreshTokenTTL)
	log.Printf("  LOG_LEVEL=%s", c.LogLevel)
	if len(c.CORSOrigins) > 0 {
		log.Printf("  CORS_ORIGINS=%v", c.CORSOrigins)
	}
}
