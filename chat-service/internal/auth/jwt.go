package auth

import (
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// ValidateToken parses and verifies the JWT token string against the secret, returning the User ID.
func ValidateToken(tokenString string, jwtSecret string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil || !token.Valid {
		return "", errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid token claims")
	}

	userID := extractUserID(claims)
	if userID == "" {
		return "", errors.New("user ID not found in token payload")
	}

	return userID, nil
}

// extractUserID checks common claim keys ("id", "userId", "sub") and converts string or float64 types
func extractUserID(claims jwt.MapClaims) string {
	keys := []string{"id", "userId", "sub"}

	for _, key := range keys {
		if val, exists := claims[key]; exists && val != nil {
			switch v := val.(type) {
			case string:
				if v != "" {
					return v
				}
			case float64:
				return fmt.Sprintf("%.0f", v)
			}
		}
	}

	return ""
}