package auth

import (
	"testing"
	"time"
)

func TestIssueAndValidateJWT_returns_correct_claims(t *testing.T) {
	secret := []byte("test-secret-key")
	userID := "user-123"
	roles := []string{"admin", "viewer"}
	forcePasswordChange := false
	ttl := 15 * time.Minute

	token, err := IssueAccessToken(secret, userID, roles, forcePasswordChange, ttl)
	if err != nil {
		t.Fatalf("IssueAccessToken() error = %v", err)
	}

	if token == "" {
		t.Fatal("IssueAccessToken() returned empty token")
	}

	claims, err := ValidateAccessToken(secret, token)
	if err != nil {
		t.Fatalf("ValidateAccessToken() error = %v", err)
	}

	if claims.UserID != userID {
		t.Errorf("claims.UserID = %q, want %q", claims.UserID, userID)
	}

	if len(claims.Roles) != len(roles) {
		t.Errorf("claims.Roles = %v, want %v", claims.Roles, roles)
	}

	if claims.ForcePasswordChange != forcePasswordChange {
		t.Errorf("claims.ForcePasswordChange = %v, want %v", claims.ForcePasswordChange, forcePasswordChange)
	}
}

func TestValidateAccessToken_expired_fails(t *testing.T) {
	secret := []byte("test-secret-key")
	userID := "user-123"
	roles := []string{"admin"}
	ttl := -1 * time.Minute // already expired

	token, err := IssueAccessToken(secret, userID, roles, false, ttl)
	if err != nil {
		t.Fatalf("IssueAccessToken() error = %v", err)
	}

	_, err = ValidateAccessToken(secret, token)
	if err == nil {
		t.Error("ValidateAccessToken() with expired token should return error, got nil")
	}
}

func TestValidateAccessToken_tampered_fails(t *testing.T) {
	secret := []byte("test-secret-key")
	userID := "user-123"
	roles := []string{"admin"}
	ttl := 15 * time.Minute

	token, err := IssueAccessToken(secret, userID, roles, false, ttl)
	if err != nil {
		t.Fatalf("IssueAccessToken() error = %v", err)
	}

	// Tamper with the token by modifying a character
	tampered := token[:len(token)-5] + "XXXXX"

	_, err = ValidateAccessToken(secret, tampered)
	if err == nil {
		t.Error("ValidateAccessToken() with tampered token should return error, got nil")
	}
}
