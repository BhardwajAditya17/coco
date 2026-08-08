//hub.go
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
    // UserID -> Set of active client connections
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

    // 2. Broadcast online status to all other active members
    h.broadcastUserStatus(client.UserID, true)
}

func (h *Hub) unregisterClient(client *Client) {
    h.mu.Lock()
    userClients, exists := h.Clients[client.UserID]
    if exists {
        if _, ok := userClients[client]; ok {
            delete(userClients, client)
            close(client.Send)

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
        // 1. Save chat message AND save notification in PostgreSQL
        insertedID, notifBytes := h.saveMessageAndNotificationToDB(msg)
        if insertedID > 0 {
            msg.ID = insertedID
        }

        chatData, err := json.Marshal(msg)
        if err != nil {
            return
        }

        h.mu.RLock()
        defer h.mu.RUnlock()

        // 2. Deliver Chat Frame AND Notification Frame to Recipient's active sockets
        if receiverClients, ok := h.Clients[msg.ReceiverID]; ok {
            for c := range receiverClients {
                // Deliver chat payload for chat window
                c.sendSafe(chatData)

                // Deliver live notification frame for Navbar / Badge counter
                if len(notifBytes) > 0 {
                    c.sendSafe(notifBytes)
                }
            }
        }

        // 3. Deliver Echo ACK back to Sender's sockets
        if senderClients, ok := h.Clients[msg.SenderID]; ok {
            for c := range senderClients {
                c.sendSafe(chatData)
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

// saveMessageAndNotificationToDB persists both chat message and notification records
func (h *Hub) saveMessageAndNotificationToDB(msg Message) (int64, []byte) {
    if h.DB == nil {
        return 0, nil
    }

    senderID, err1 := strconv.Atoi(msg.SenderID)
    receiverID, err2 := strconv.Atoi(msg.ReceiverID)
    if err1 != nil || err2 != nil {
        log.Printf("[DB Save Warning]: Invalid sender/receiver format: %s -> %s", msg.SenderID, msg.ReceiverID)
        return 0, nil
    }

    // 1. Insert into "Message" table
    queryMessage := `
        INSERT INTO "Message" (sender_id, receiver_id, content, is_read, created_at)
        VALUES ($1, $2, $3, false, NOW())
        RETURNING id, created_at
    `

    var lastInsertID int64
    var createdAt time.Time
    err := h.DB.QueryRow(queryMessage, senderID, receiverID, msg.Content).Scan(&lastInsertID, &createdAt)
    if err != nil {
        log.Printf("[DB Save Error]: Failed to persist message: %v", err)
        return 0, nil
    }

    // 2. Insert into "Notification" table (Matching Prisma PascalCase schema name)
    queryNotification := `
        INSERT INTO "Notification" (recipient_id, actor_id, type, target_id, message, is_read, created_at)
        VALUES ($1, $2, 'chat', $3, $4, false, NOW())
        RETURNING id
    `

    var notifID int64
    errNotif := h.DB.QueryRow(queryNotification, receiverID, senderID, strconv.FormatInt(lastInsertID, 10), msg.Content).Scan(&notifID)
    if errNotif != nil {
        log.Printf("[DB Notification Save Error]: %v", errNotif)
    }

    // 3. Construct WS Live Notification Frame payload
    notifPayload := Message{
        ID:               notifID,
        Type:             TypeNotification,
        RecipientID:      msg.ReceiverID,
        SenderID:         msg.SenderID,
        ReceiverID:       msg.ReceiverID,
        ActorID:          int64(senderID),
        Message:          msg.Content,
        NotificationType: "chat",
        TargetID:         strconv.FormatInt(lastInsertID, 10),
        Timestamp:        createdAt.UnixMilli(),
        CreatedAt:        createdAt.Format(time.RFC3339),
        IsRead:           false,
    }

    notifBytes, err := json.Marshal(notifPayload)
    if err != nil {
        return lastInsertID, nil
    }

    return lastInsertID, notifBytes
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

// SendNotification pushes custom notifications (e.g. from Express) to WS
func (h *Hub) SendNotification(recipientID string, payload []byte) bool {
    h.mu.RLock()
    defer h.mu.RUnlock()

    userClients, exists := h.Clients[recipientID]
    if !exists || len(userClients) == 0 {
        return false
    }

    for client := range userClients {
        client.sendSafe(payload)
    }

    return true
}