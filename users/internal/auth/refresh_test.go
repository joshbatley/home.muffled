package auth

import "testing"

func TestGenerateRefreshToken_returns_random_string(t *testing.T) {
	token1, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}

	token2, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken() error = %v", err)
	}

	if token1 == "" {
		t.Error("GenerateRefreshToken() returned empty string")
	}

	if token1 == token2 {
		t.Error("GenerateRefreshToken() returned same token twice")
	}
}

func TestHashRefreshToken_returns_consistent_hash(t *testing.T) {
	token := "test-refresh-token"

	hash1 := HashRefreshToken(token)
	hash2 := HashRefreshToken(token)

	if hash1 == "" {
		t.Error("HashRefreshToken() returned empty string")
	}

	if hash1 != hash2 {
		t.Errorf("HashRefreshToken() not consistent: %q != %q", hash1, hash2)
	}

	if hash1 == token {
		t.Error("HashRefreshToken() returned unhashed token")
	}
}
