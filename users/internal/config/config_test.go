package config

import (
	"testing"
	"time"
)

func TestLoad_MissingRequiredVar_ReturnsError(t *testing.T) {
	// Clear all env vars that might be set
	t.Setenv("DATABASE_URL", "")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("SEED_USERNAME", "")
	t.Setenv("SEED_PASSWORD", "")

	_, err := Load()
	if err == nil {
		t.Error("expected error when required env vars are missing, got nil")
	}
}

func TestLoad_DefaultsApplied_WhenOptionalVarsAbsent(t *testing.T) {
	// Set only required vars
	t.Setenv("DATABASE_URL", "postgres://localhost/test")
	t.Setenv("JWT_SECRET", "secret")
	t.Setenv("SEED_USERNAME", "admin")
	t.Setenv("SEED_PASSWORD", "password")

	// Clear optional vars
	t.Setenv("PORT", "")
	t.Setenv("ACCESS_TOKEN_TTL", "")
	t.Setenv("REFRESH_TOKEN_TTL", "")
	t.Setenv("LOG_LEVEL", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != "8080" {
		t.Errorf("Port = %q, want %q", cfg.Port, "8080")
	}
	if cfg.AccessTokenTTL != 15*time.Minute {
		t.Errorf("AccessTokenTTL = %v, want %v", cfg.AccessTokenTTL, 15*time.Minute)
	}
	if cfg.RefreshTokenTTL != 7*24*time.Hour {
		t.Errorf("RefreshTokenTTL = %v, want %v", cfg.RefreshTokenTTL, 7*24*time.Hour)
	}
	if cfg.LogLevel != "info" {
		t.Errorf("LogLevel = %q, want %q", cfg.LogLevel, "info")
	}
}

func TestLoad_ValidConfig_ParsesCorrectly(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("DATABASE_URL", "postgres://localhost/testdb")
	t.Setenv("JWT_SECRET", "mysecret")
	t.Setenv("ACCESS_TOKEN_TTL", "30m")
	t.Setenv("REFRESH_TOKEN_TTL", "48h")
	t.Setenv("SEED_USERNAME", "testadmin")
	t.Setenv("SEED_PASSWORD", "testpass")
	t.Setenv("LOG_LEVEL", "debug")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.Port != "9090" {
		t.Errorf("Port = %q, want %q", cfg.Port, "9090")
	}
	if cfg.DatabaseURL != "postgres://localhost/testdb" {
		t.Errorf("DatabaseURL = %q, want %q", cfg.DatabaseURL, "postgres://localhost/testdb")
	}
	if cfg.JWTSecret != "mysecret" {
		t.Errorf("JWTSecret = %q, want %q", cfg.JWTSecret, "mysecret")
	}
	if cfg.AccessTokenTTL != 30*time.Minute {
		t.Errorf("AccessTokenTTL = %v, want %v", cfg.AccessTokenTTL, 30*time.Minute)
	}
	if cfg.RefreshTokenTTL != 48*time.Hour {
		t.Errorf("RefreshTokenTTL = %v, want %v", cfg.RefreshTokenTTL, 48*time.Hour)
	}
	if cfg.SeedUsername != "testadmin" {
		t.Errorf("SeedUsername = %q, want %q", cfg.SeedUsername, "testadmin")
	}
	if cfg.SeedPassword != "testpass" {
		t.Errorf("SeedPassword = %q, want %q", cfg.SeedPassword, "testpass")
	}
	if cfg.LogLevel != "debug" {
		t.Errorf("LogLevel = %q, want %q", cfg.LogLevel, "debug")
	}
}
