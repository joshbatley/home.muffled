package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID              string   `json:"user_id"`
	Email               string   `json:"email"`
	Roles               []string `json:"roles"`
	Permissions         []string `json:"permissions"`
	ForcePasswordChange bool     `json:"force_password_change"`
	jwt.RegisteredClaims
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

func IssueAccessToken(secret []byte, userID, email string, roles, permissions []string, forcePasswordChange bool, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:              userID,
		Email:               email,
		Roles:               roles,
		Permissions:         permissions,
		ForcePasswordChange: forcePasswordChange,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(now),
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func ValidateAccessToken(secret []byte, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}
