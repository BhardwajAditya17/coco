import { useEffect, useRef, useState, useCallback } from 'react';

export const useWebSocket = (token, currentUser) => {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const reconnectTimeout = useRef(null);

  const connect = useCallback(() => {
    if (!token) return;

    // 🛑 GUARD 1: Prevent duplicate WebSocket connections in React 18 Dev Mode
    if (
      ws.current &&
      (ws.current.readyState === WebSocket.OPEN ||
        ws.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    ws.current = new WebSocket(`${wsUrl}?token=${token}`);

    ws.current.onopen = () => {
      console.log('⚡ Connected to Go WebSocket Server');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'chat') {
          // 🛡️ GUARD 2: Deduplicate incoming chat messages in state
          setMessages((prev) => {
            const isDuplicate = prev.some((m) => {
              // Match by server-assigned message ID if available
              if (data.id && m.id) {
                return String(m.id) === String(data.id);
              }

              // Fallback match: Check sender, content, and timestamp proximity (<2 seconds)
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
        } else if (data.type === 'online_list') {
          if (Array.isArray(data.onlineUsers)) {
            setOnlineUsers(new Set(data.onlineUsers));
          }
        } else if (data.type === 'status') {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            const userId = String(data.senderId || data.sender_id);
            if (data.isOnline) next.add(userId);
            else next.delete(userId);
            return next;
          });
        } else if (data.type === 'typing') {
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

    ws.current.onclose = () => {
      setIsConnected(false);
      ws.current = null;
      reconnectTimeout.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (err) => {
      console.error('WebSocket Error:', err);
      if (ws.current) ws.current.close();
    };
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect]);

  const sendMessage = (receiverId, content) => {
    if (ws.current && isConnected) {
      const payload = {
        type: 'chat',
        senderId: String(currentUser?.id),
        receiverId: String(receiverId),
        content,
        timestamp: Date.now(),
      };

      ws.current.send(JSON.stringify(payload));
    }
  };

  const sendTypingStatus = (receiverId, isTyping) => {
    if (ws.current && isConnected) {
      ws.current.send(
        JSON.stringify({
          type: 'typing',
          senderId: String(currentUser?.id),
          receiverId: String(receiverId),
          isTyping,
        })
      );
    }
  };

  return {
    messages,
    setMessages,
    onlineUsers,
    typingUsers,
    isConnected,
    sendMessage,
    sendTypingStatus,
  };
};