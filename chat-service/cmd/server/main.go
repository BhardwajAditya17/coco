package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"community-connect/chat-service/internal/config"
	"community-connect/chat-service/internal/db"
	"community-connect/chat-service/internal/websocket"
)

func main() {
	cfg := config.LoadConfig()

	// Initialize database connection pool
	dbPool := db.InitDB(cfg.DatabaseURL)
	defer dbPool.Close()

	// Initialize Hub with DB instance
	hub := websocket.NewHub(dbPool)
	go hub.Run()

	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		websocket.ServeWs(hub, cfg.JWTSecret, cfg.AllowedOrigin, w, r)
	})

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		log.Printf("🚀 Go Chat Microservice listening on port %s...", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("❌ HTTP Server Error: %v", err)
		}
	}()

	<-stop
	log.Println("🛑 Shutting down server gracefully...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced shutdown: %v", err)
	}

	log.Println("✅ Chat Service stopped cleanly.")
}