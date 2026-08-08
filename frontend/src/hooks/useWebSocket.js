import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (token, currentUser) => {
  const [messages, setMessages] = useState([]);
  const [latestNotification, setLatestNotification] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);

  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (!token) return;

    // 🛑 Guard against duplicate connection attempts
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    const socket = new WebSocket(`${wsUrl}?token=${token}`);
    ws.current = socket;

    socket.onopen = () => {
      console.log('⚡ Connected to Go WebSocket Server');
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 🔔 1. Notifications (Server push or Chat notification)
        if (data.type === 'notification' || data.type === 'ws:notification') {
          const payload = data.payload || data.data || data;
          setLatestNotification(payload);
          window.dispatchEvent(
            new CustomEvent('ws:notification', { detail: payload })
          );
        } 
        // 💬 2. Real-time Chat Messages
        else if (data.type === 'chat' || data.type === 'message') {
          window.dispatchEvent(
            new CustomEvent('ws:chat_message', { detail: data })
          );

          setMessages((prev) => {
            const isDuplicate = prev.some((m) => {
              if (data.id && m.id) return String(m.id) === String(data.id);

              const mSender = String(m.senderId || m.sender_id || '');
              const dSender = String(data.senderId || data.sender_id || '');
              const mTime = Number(m.timestamp || m.createdAt || 0);
              const dTime = Number(data.timestamp || data.createdAt || 0);

              return (
                mSender === dSender &&
                m.content === data.content &&
                Math.abs(mTime - dTime) < 2000
              );
            });

            if (isDuplicate) return prev;
            return [...prev, data];
          });
        } 
        // 🟢 3. Initial Online Users List
        else if (data.type === 'online_list') {
          if (Array.isArray(data.onlineUsers)) {
            setOnlineUsers(new Set(data.onlineUsers));
          }
        } 
        // 🔄 4. Live User Online/Offline Status
        else if (data.type === 'status') {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            const userId = String(data.senderId || data.sender_id);
            if (data.isOnline) {
              next.add(userId);
            } else {
              next.delete(userId);
            }
            return next;
          });
        } 
        // ✍️ 5. Typing Indicators
        else if (data.type === 'typing') {
          const sender = String(data.senderId || data.sender_id);
          setTypingUsers((prev) => ({
            ...prev,
            [sender]: data.isTyping,
          }));
        }
      } catch (err) {
        console.error('Failed to parse WS payload:', err);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      ws.current = null;

      // Auto-reconnect after 3 seconds
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    socket.onerror = (err) => {
      console.error('WebSocket connection error:', err);
    };
  }, [token]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      if (ws.current) {
        ws.current.onopen = null;
        ws.current.onmessage = null;
        ws.current.onerror = null;
        ws.current.onclose = null;

        if (
          ws.current.readyState === WebSocket.OPEN ||
          ws.current.readyState === WebSocket.CONNECTING
        ) {
          ws.current.close();
        }
        ws.current = null;
      }
    };
  }, [connect]);

  // Memoized message dispatch function
  const sendMessage = useCallback(
    (receiverId, content) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        const payload = {
          type: 'chat',
          senderId: String(currentUser?.id),
          receiverId: String(receiverId),
          content,
          timestamp: Date.now(),
        };

        ws.current.send(JSON.stringify(payload));
      }
    },
    [currentUser?.id]
  );

  // Memoized typing status function
  const sendTypingStatus = useCallback(
    (receiverId, isTyping) => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: 'typing',
            senderId: String(currentUser?.id),
            receiverId: String(receiverId),
            isTyping,
          })
        );
      }
    },
    [currentUser?.id]
  );

  return {
    messages,
    setMessages,
    latestNotification,
    onlineUsers,
    typingUsers,
    isConnected,
    sendMessage,
    sendTypingStatus,
  };
};