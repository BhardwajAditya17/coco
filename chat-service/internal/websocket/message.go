package websocket

type MessageType string

const (
	TypeChat         MessageType = "chat"
	TypeTyping       MessageType = "typing"
	TypeStatus       MessageType = "status"
	TypeOnlineList   MessageType = "online_list"
	TypeNotification MessageType = "notification"
)

type Message struct {
	ID          int64       `json:"id,omitempty"`
	Type        MessageType `json:"type"` // "chat", "typing", "status", "online_list", "notification"
	SenderID    string      `json:"senderId"`
	ReceiverID  string      `json:"receiverId,omitempty"`
	Content     string      `json:"content,omitempty"`
	Timestamp   int64       `json:"timestamp"`
	IsTyping    bool        `json:"isTyping,omitempty"`
	IsOnline    bool        `json:"isOnline,omitempty"`
	OnlineUsers []string    `json:"onlineUsers,omitempty"`

	// Notification payload fields sent from Express
	RecipientID      string `json:"recipient_id,omitempty"`
	ActorID          int64  `json:"actor_id,omitempty"`
	ActorName        string `json:"actor_name,omitempty"`
	ActorAvatar      string `json:"actor_avatar,omitempty"`
	TargetID         string `json:"target_id,omitempty"`
	Message          string `json:"message,omitempty"`
	NotificationType string `json:"notification_type,omitempty"` // Action subtype: 'like', 'comment', 'follow', 'chat'
	IsRead           bool   `json:"is_read,omitempty"`
	CreatedAt        string `json:"created_at,omitempty"`
}