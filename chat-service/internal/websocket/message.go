package websocket

type MessageType string

const (
	TypeChat       MessageType = "chat"
	TypeTyping     MessageType = "typing"
	TypeStatus     MessageType = "status"
	TypeOnlineList MessageType = "online_list"
)

type Message struct {
	ID          int64       `json:"id,omitempty"`
	Type        MessageType `json:"type"`       // "chat", "typing", "status", "online_list"
	SenderID    string      `json:"senderId"`
	ReceiverID  string      `json:"receiverId,omitempty"`
	Content     string      `json:"content,omitempty"`
	Timestamp   int64       `json:"timestamp"`
	IsTyping    bool        `json:"isTyping,omitempty"`
	IsOnline    bool        `json:"isOnline,omitempty"`
	OnlineUsers []string    `json:"onlineUsers,omitempty"`
}