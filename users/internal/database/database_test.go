package database

import (
	"testing"
)

func TestConnect_BadURL_ReturnsError(t *testing.T) {
	_, err := Connect("postgres://invalid:invalid@localhost:9999/nonexistent?sslmode=disable&connect_timeout=1")
	if err == nil {
		t.Error("expected error for bad DATABASE_URL, got nil")
	}
}
