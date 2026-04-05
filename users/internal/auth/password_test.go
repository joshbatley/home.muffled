package auth

import "testing"

func TestHashAndComparePassword(t *testing.T) {
	h, err := HashPassword("secret123")
	if err != nil {
		t.Fatal(err)
	}
	if err := ComparePassword(h, "secret123"); err != nil {
		t.Fatal(err)
	}
	if err := ComparePassword(h, "wrong"); err == nil {
		t.Fatal("expected mismatch")
	}
}
