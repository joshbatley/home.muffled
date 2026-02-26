package auth

import "testing"

func TestHashPassword_and_compare_succeeds(t *testing.T) {
	password := "mysecretpassword"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if hash == "" {
		t.Fatal("HashPassword() returned empty hash")
	}

	if err := ComparePassword(hash, password); err != nil {
		t.Errorf("ComparePassword() error = %v, want nil", err)
	}
}

func TestComparePassword_wrong_password_fails(t *testing.T) {
	password := "mysecretpassword"
	wrongPassword := "wrongpassword"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword() error = %v", err)
	}

	if err := ComparePassword(hash, wrongPassword); err == nil {
		t.Error("ComparePassword() with wrong password should return error, got nil")
	}
}
