//notification.go
package websocket

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "strconv"
)

// stringifyID handles string, float64, int, int64 IDs from incoming JSON
func stringifyID(val interface{}) string {
    if val == nil {
        return ""
    }
    switch v := val.(type) {
    case string:
        return v
    case float64:
        return strconv.FormatInt(int64(v), 10)
    case int:
        return strconv.Itoa(v)
    case int64:
        return strconv.FormatInt(v, 10)
    default:
        return fmt.Sprintf("%v", v)
    }
}

// HandleInternalNotify processes HTTP POST requests from Express and pushes frames via WS
func HandleInternalNotify(hub *Hub, internalSecret string, w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }
    defer r.Body.Close()

    // 🔒 1. Verify Internal Service Secret Header
    if internalSecret != "" {
        providedSecret := r.Header.Get("X-Internal-Secret")
        if providedSecret != internalSecret {
            log.Printf("🔒 [WS Internal Notify] Unauthorized: invalid or missing X-Internal-Secret header")
            http.Error(w, "Unauthorized internal request", http.StatusUnauthorized)
            return
        }
    }

    // 📦 2. Dynamic map preserves all rich payload fields (actor_name, actor_avatar, data, etc.)
    var payloadMap map[string]interface{}
    if err := json.NewDecoder(r.Body).Decode(&payloadMap); err != nil {
        log.Printf("❌ [WS Internal Notify] Failed to decode JSON payload: %v", err)
        http.Error(w, "Invalid notification payload", http.StatusBadRequest)
        return
    }

    // 🏷️ 3. Enforce notification frame type
    payloadMap["type"] = string(TypeNotification)

    // 🎯 4. Resolve target recipient ID (Handles string or numeric JSON values cleanly)
    var targetUserID string
    if val, ok := payloadMap["recipient_id"]; ok && val != nil {
        targetUserID = stringifyID(val)
    }
    if targetUserID == "" {
        if val, ok := payloadMap["receiverId"]; ok && val != nil {
            targetUserID = stringifyID(val)
        }
    }

    if targetUserID == "" {
        log.Println("⚠️ [WS Internal Notify] Rejected: missing recipient_id/receiverId")
        http.Error(w, "Missing recipient user ID", http.StatusBadRequest)
        return
    }

    // 🔄 5. Re-serialize payload to JSON bytes
    payloadBytes, err := json.Marshal(payloadMap)
    if err != nil {
        log.Printf("❌ [WS Internal Notify] Serialization error: %v", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }

    // 🚀 6. Deliver frame to active WS client(s)
    delivered := hub.SendNotification(targetUserID, payloadBytes)

    if delivered {
        log.Printf("🚀 [WS Internal Notify] Live frame delivered to User %s", targetUserID)
    } else {
        log.Printf("ℹ️ [WS Internal Notify] User %s is offline. (Saved in DB by Express)", targetUserID)
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)

    json.NewEncoder(w).Encode(map[string]interface{}{
        "status":    "success",
        "delivered": delivered,
    })
}