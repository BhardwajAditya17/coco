//handler.go
package websocket

import (
	"log"
	"net/http"

	"community-connect/chat-service/internal/auth"

	"github.com/gorilla/websocket"
)

func ServeWs(hub *Hub, jwtSecret string, allowedOrigin string, w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin: func(r *http.Request) bool {
			if allowedOrigin == "*" || allowedOrigin == "" {
				return true
			}
			return r.Header.Get("Origin") == allowedOrigin
		},
	}

	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "Token parameter missing", http.StatusUnauthorized)
		return
	}

	userID, err := auth.ValidateToken(token, jwtSecret)
	if err != nil {
		log.Printf("[Auth Failed]: %v", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[Upgrade Error]: %v", err)
		return
	}

	client := &Client{
		UserID: userID,
		Hub:    hub,
		Conn:   conn,
		Send:   make(chan []byte, 256),
	}

	client.Hub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}