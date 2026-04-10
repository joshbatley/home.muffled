package auth

import (
	"testing"
	"time"
)

func TestIssueAndValidateAccessToken(t *testing.T) {
	secret := []byte("test-secret-key-32bytes-long!!")
	tok, err := IssueAccessToken(secret, "uid-1", "a@b.c", []string{"user"}, []string{"intranet:read"}, false, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := ValidateAccessToken(secret, tok)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != "uid-1" || claims.Email != "a@b.c" {
		t.Fatalf("claims: %+v", claims)
	}
	if len(claims.Permissions) != 1 || claims.Permissions[0] != "intranet:read" {
		t.Fatalf("perms: %v", claims.Permissions)
	}
}

func TestValidateAccessTokenWrongSecret(t *testing.T) {
	secret := []byte("test-secret-key-32bytes-long!!")
	tok, err := IssueAccessToken(secret, "u", "e@e.e", nil, nil, false, time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	_, err = ValidateAccessToken([]byte("other-secret-key-32bytes-long!"), tok)
	if err == nil {
		t.Fatal("expected error")
	}
}
