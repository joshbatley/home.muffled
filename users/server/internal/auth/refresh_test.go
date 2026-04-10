package auth

import "testing"

func TestGenerateRefreshToken(t *testing.T) {
	a, err := GenerateRefreshToken()
	if err != nil {
		t.Fatal(err)
	}
	b, err := GenerateRefreshToken()
	if err != nil {
		t.Fatal(err)
	}
	if a == b {
		t.Fatal("tokens should differ")
	}
	if HashRefreshToken(a) == HashRefreshToken(b) {
		t.Fatal("hashes should differ")
	}
}
