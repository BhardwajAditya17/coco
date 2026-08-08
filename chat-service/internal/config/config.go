package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                  string
	JWTSecret             string
	InternalServiceSecret string
	AllowedOrigin         string
	DatabaseURL           string
}

func LoadConfig() *Config {
	_ = godotenv.Load() // Loads .env if available

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("❌ FATAL: JWT_SECRET environment variable is missing!")
	}

	internalSecret := os.Getenv("INTERNAL_SERVICE_SECRET")
	if internalSecret == "" {
		log.Fatal("❌ FATAL: INTERNAL_SERVICE_SECRET environment variable is missing!")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("❌ FATAL: DATABASE_URL environment variable is missing!")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	origin := os.Getenv("ALLOWED_ORIGIN")
	if origin == "" {
		origin = "*" // Default to wildcard for development
	}

	return &Config{
		Port:                  port,
		JWTSecret:             jwtSecret,
		InternalServiceSecret: internalSecret,
		AllowedOrigin:         origin,
		DatabaseURL:           dbURL,
	}
}