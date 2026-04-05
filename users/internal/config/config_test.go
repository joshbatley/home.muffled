package config

import (
	"os"
	"testing"
	"time"
)

func TestLoad_Required(t *testing.T) {
	os.Clearenv()
	os.Setenv("DATABASE_URL", "postgres://localhost/test")
	os.Setenv("JWT_SECRET", "secret")
	os.Setenv("SEED_EMAIL", "a@b.c")
	os.Setenv("SEED_PASSWORD", "pw")
	defer os.Clearenv()

	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.Port != "8080" {
		t.Fatalf("port: %s", c.Port)
	}
	if c.AccessTokenTTL != 15*time.Minute {
		t.Fatalf("access ttl: %v", c.AccessTokenTTL)
	}
}

func TestLoad_MissingDatabase(t *testing.T) {
	os.Clearenv()
	os.Setenv("JWT_SECRET", "x")
	os.Setenv("SEED_EMAIL", "a@b.c")
	os.Setenv("SEED_PASSWORD", "p")
	defer os.Clearenv()

	if _, err := Load(); err == nil {
		t.Fatal("expected error")
	}
}
