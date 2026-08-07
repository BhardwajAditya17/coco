package websocket

import (
	"database/sql"
	"encoding/json"
	"log"
	"strconv"
	"sync"
	"time"
)

type Hub struct {
	// UserID -> Set of active client connections (supports multi-tab / multi-device)
	Clients    map[string]map[*Client]bool
	Broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	DB         *sql.DB
	mu         sync.RWMutex
}

func NewHub(db *sql.DB) *Hub {
	return &Hub{
		Clients:    make(map[string]map[*Client]bool),
		Broadcast:  make(chan Message, 256),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
		DB:         db,
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.registerClient(client)

		case client := <-h.Unregister:
			h.unregisterClient(client)

		case msg := <-h.Broadcast:
			h.handleBroadcast(msg)
		}
	}
}

func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	if _, exists := h.Clients[client.UserID]; !exists {
		h.Clients[client.UserID] = make(map[*Client]bool)
	}
	h.Clients[client.UserID][client] = true

	// Build active online user list for newly connected client
	var onlineUserIDs []string
	for uID := range h.Clients {
		onlineUserIDs = append(onlineUserIDs, uID)
	}
	h.mu.Unlock()

	// 1. Send currently online users list to the newly connected user
	initMsg := Message{
		Type:        TypeOnlineList,
		OnlineUsers: onlineUserIDs,
		Timestamp:   time.Now().UnixMilli(),
	}
	if data, err := json.Marshal(initMsg); err == nil {
		client.sendSafe(data)
	}

	// 2. Broadcast online status to all other active community members
	h.broadcastUserStatus(client.UserID, true)
}

func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	userClients, exists := h.Clients[client.UserID]
	if exists {
		if _, ok := userClients[client]; ok {
			delete(userClients, client)
			close(client.Send)

			// Remove user key completely if all devices/tabs are closed
			if len(userClients) == 0 {
				delete(h.Clients, client.UserID)
				h.mu.Unlock()
				h.broadcastUserStatus(client.UserID, false)
				return
			}
		}
	}
	h.mu.Unlock()
}

func (h *Hub) handleBroadcast(msg Message) {
	switch msg.Type {
	case TypeChat:
		// 1. Save chat message directly into PostgreSQL
		insertedID := h.saveMessageToDB(msg)
		if insertedID > 0 {
			msg.ID = insertedID
		}

		data, err := json.Marshal(msg)
		if err != nil {
			return
		}

		h.mu.RLock()
		defer h.mu.RUnlock()

		// 2. Deliver to Recipient's active sockets
		if receiverClients, ok := h.Clients[msg.ReceiverID]; ok {
			for c := range receiverClients {
				c.sendSafe(data)
			}
		}

		// 3. Deliver Echo ACK back to Sender's sockets
		if senderClients, ok := h.Clients[msg.SenderID]; ok {
			for c := range senderClients {
				c.sendSafe(data)
			}
		}

	case TypeTyping:
		data, err := json.Marshal(msg)
		if err != nil {
			return
		}

		h.mu.RLock()
		if receiverClients, ok := h.Clients[msg.ReceiverID]; ok {
			for c := range receiverClients {
				c.sendSafe(data)
			}
		}
		h.mu.RUnlock()
	}
}

func (h *Hub) saveMessageToDB(msg Message) int64 {
	if h.DB == nil {
		return 0
	}

	senderID, err1 := strconv.Atoi(msg.SenderID)
	receiverID, err2 := strconv.Atoi(msg.ReceiverID)
	if err1 != nil || err2 != nil {
		log.Printf("[DB Save Warning]: Invalid sender/receiver format: %s -> %s", msg.SenderID, msg.ReceiverID)
		return 0
	}

	query := `
		INSERT INTO "Message" (sender_id, receiver_id, content, is_read, created_at)
		VALUES ($1, $2, $3, false, NOW())
		RETURNING id
	`

	var lastInsertID int64
	err := h.DB.QueryRow(query, senderID, receiverID, msg.Content).Scan(&lastInsertID)
	if err != nil {
		log.Printf("[DB Save Error]: Failed to persist message: %v", err)
		return 0
	}

	return lastInsertID
}

func (h *Hub) broadcastUserStatus(userID string, isOnline bool) {
	statusMsg := Message{
		Type:      TypeStatus,
		SenderID:  userID,
		IsOnline:  isOnline,
		Timestamp: time.Now().UnixMilli(),
	}
	data, err := json.Marshal(statusMsg)
	if err != nil {
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for uID, clients := range h.Clients {
		if uID != userID {
			for c := range clients {
				c.sendSafe(data)
			}
		}
	}
}