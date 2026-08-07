package auth

import (
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

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

	// Supports claims formatted as "id", "userId", or "sub"
	var userID string
	if val, ok := claims["id"].(string); ok {
		userID = val
	} else if val, ok := claims["userId"].(string); ok {
		userID = val
	} else if val, ok := claims["sub"].(string); ok {
		userID = val
	} else if val, ok := claims["id"].(float64); ok {
		userID = fmt.Sprintf("%.0f", val)
	}

	if userID == "" {
		return "", errors.New("user ID not found in token payload")
	}

	return userID, nil
}