package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	AccessTokenTTL    time.Duration
	RefreshTokenTTL   time.Duration
	PasswordResetTTL  time.Duration
	SeedEmail       string
	SeedPassword    string
	LogLevel        string
	CORSOrigins     []string
	PublicBaseURL   string

	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	MailFrom     string
}

func Load() (*Config, error) {
	accessTTL, err := parseDurationOrDefault("ACCESS_TOKEN_TTL", 15*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("invalid ACCESS_TOKEN_TTL: %w", err)
	}

	refreshTTL, err := parseDurationOrDefault("REFRESH_TOKEN_TTL", 7*24*time.Hour)
	if err != nil {
		return nil, fmt.Errorf("invalid REFRESH_TOKEN_TTL: %w", err)
	}

	resetTTL, err := parseDurationOrDefault("PASSWORD_RESET_TTL", time.Hour)
	if err != nil {
		return nil, fmt.Errorf("invalid PASSWORD_RESET_TTL: %w", err)
	}

	cfg := &Config{
		Port:            getEnvOrDefault("PORT", "8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		JWTSecret:       os.Getenv("JWT_SECRET"),
		AccessTokenTTL:  accessTTL,
		RefreshTokenTTL:  refreshTTL,
		PasswordResetTTL: resetTTL,
		SeedEmail:       os.Getenv("SEED_EMAIL"),
		SeedPassword:    os.Getenv("SEED_PASSWORD"),
		LogLevel:        getEnvOrDefault("LOG_LEVEL", "info"),
		CORSOrigins:     parseCORSOrigins(os.Getenv("CORS_ORIGINS")),
		PublicBaseURL:   strings.TrimRight(os.Getenv("PUBLIC_BASE_URL"), "/"),

		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     getEnvOrDefault("SMTP_PORT", "587"),
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		MailFrom:     os.Getenv("MAIL_FROM"),
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
	if c.SeedEmail == "" {
		return errors.New("SEED_EMAIL is required")
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

func (c *Config) Log() {
	log.Printf("Config loaded:")
	log.Printf("  PORT=%s", c.Port)
	log.Printf("  ACCESS_TOKEN_TTL=%s", c.AccessTokenTTL)
	log.Printf("  REFRESH_TOKEN_TTL=%s", c.RefreshTokenTTL)
	log.Printf("  LOG_LEVEL=%s", c.LogLevel)
	if c.PublicBaseURL != "" {
		log.Printf("  PUBLIC_BASE_URL=%s", c.PublicBaseURL)
	}
	if len(c.CORSOrigins) > 0 {
		log.Printf("  CORS_ORIGINS=%v", c.CORSOrigins)
	}
	if c.SMTPHost != "" {
		log.Printf("  SMTP_HOST=%s (mail enabled)", c.SMTPHost)
	} else {
		log.Printf("  SMTP not configured (transactional email disabled)")
	}
}

func (c *Config) MailConfigured() bool {
	return c.SMTPHost != "" && c.SMTPUser != "" && c.SMTPPassword != "" && c.MailFrom != ""
}
