import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Search, Loader2, AlertCircle, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
import { UserList } from '../components/chat/UserList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { MessageInput } from '../components/chat/MessageInput';
import api from '../services/api';

const ChatPage = () => {
  const { user: currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Extract recipient ID from URL parameter or router state
  const targetUserId = searchParams.get('userId') || location.state?.recipientId;
  const recipientFromState = location.state?.recipient;

  // State Management
  const [users, setUsers] = useState([]);
  const [activeUser, setActiveUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Persistent Chat History State
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Consume Global WebSocket Context
  const {
    messages: liveWsMessages,
    onlineUsers,
    typingUsers,
    isConnected,
    sendMessage,
    sendTypingStatus,
  } = useSocket();

  // 1. Fetch Contacted Users / Recent Conversations & Normalize Unread Counts
  useEffect(() => {
    let isMounted = true;

    const fetchContactedUsers = async () => {
      try {
        setIsLoadingUsers(true);
        setFetchError(null);

        const response = await api.get('/messages/conversations');
        if (!isMounted) return;

        const contactedData = response.data?.data || response.data || [];

        // Standardize unread counts across different API schema keys
        const normalizedData = contactedData.map((u) => ({
          ...u,
          unreadCount: Number(u.unreadCount ?? u.unread_count ?? u.unread ?? 0),
        }));

        setUsers(normalizedData);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to fetch conversation list:', err);
        setFetchError('Unable to load conversations. Please try refreshing.');
      } finally {
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    if (currentUser?.id) {
      fetchContactedUsers();
    }

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // 2. Dynamic WebSocket Syncing (Supports existing contacts and new incoming senders)
  useEffect(() => {
    if (!liveWsMessages.length || !currentUser?.id) return;

    const latestWsMsg = liveWsMessages[liveWsMessages.length - 1];
    if (!latestWsMsg) return;

    const senderId = String(latestWsMsg.sender_id || latestWsMsg.senderId || '');
    const receiverId = String(latestWsMsg.receiver_id || latestWsMsg.receiverId || '');
    const currentUserId = String(currentUser.id);

    // Determine the chat partner ID
    const otherUserId = senderId === currentUserId ? receiverId : senderId;
    if (!otherUserId || otherUserId === 'me') return;

    const msgTime =
      latestWsMsg.created_at ||
      latestWsMsg.createdAt ||
      latestWsMsg.timestamp ||
      new Date().toISOString();
    const msgContent = latestWsMsg.content || latestWsMsg.text || '';
    const isFromOther = senderId !== currentUserId;

    setUsers((prevUsers) => {
      const existingIndex = prevUsers.findIndex((u) => String(u.id) === otherUserId);
      const isCurrentlyActive = activeUser && String(activeUser.id) === otherUserId;

      // SCENARIO A: Contact already exists in current state
      if (existingIndex !== -1) {
        const updatedUsers = [...prevUsers];
        const targetUser = { ...updatedUsers[existingIndex] };

        targetUser.lastMessage = msgContent;
        targetUser.lastMessageTime = msgTime;

        if (isFromOther && !isCurrentlyActive) {
          const currentUnread = Number(targetUser.unreadCount ?? 0);
          targetUser.unreadCount = currentUnread + 1;
        } else if (isCurrentlyActive) {
          targetUser.unreadCount = 0;
        }

        // Reorder list: bring active conversation to top
        updatedUsers.splice(existingIndex, 1);
        return [targetUser, ...updatedUsers];
      }

      // SCENARIO B: First message from a new contact not yet in sidebar
      if (isFromOther) {
        const newContact = {
          id: otherUserId,
          name: latestWsMsg.senderName || latestWsMsg.sender_name || 'New Contact',
          avatar_url: latestWsMsg.senderAvatar || latestWsMsg.sender_avatar || null,
          lastMessage: msgContent,
          lastMessageTime: msgTime,
          unreadCount: isCurrentlyActive ? 0 : 1,
        };

        // Asynchronously enrich missing user details from API
        api.get(`/users/${otherUserId}`)
          .then((res) => {
            const userData = res.data?.data || res.data;
            if (userData) {
              setUsers((currentList) =>
                currentList.map((u) =>
                  String(u.id) === otherUserId ? { ...u, ...userData } : u
                )
              );
            }
          })
          .catch((err) => {
            console.error(`Failed to load profile metadata for new contact ID ${otherUserId}:`, err);
          });

        return [newContact, ...prevUsers];
      }

      return prevUsers;
    });
  }, [liveWsMessages, currentUser?.id, activeUser]);

  // 3. Auto-Select or Inject Contact from URL Search Params / Navigation State
  useEffect(() => {
    if (!targetUserId || isLoadingUsers) return;

    const targetIdStr = String(targetUserId);
    const existingUser = users.find((u) => String(u.id) === targetIdStr);

    if (existingUser) {
      handleSelectUser(existingUser);
    } else if (recipientFromState && String(recipientFromState.id) === targetIdStr) {
      setUsers((prev) => [
        { ...recipientFromState, unreadCount: 0 },
        ...prev.filter((u) => String(u.id) !== targetIdStr),
      ]);
      handleSelectUser(recipientFromState);
    } else {
      const fetchTargetUserProfile = async () => {
        try {
          const res = await api.get(`/users/${targetUserId}`);
          const userData = res.data?.data || res.data;
          if (userData) {
            setUsers((prev) => [
              { ...userData, unreadCount: 0 },
              ...prev.filter((u) => String(u.id) !== targetIdStr),
            ]);
            handleSelectUser(userData);
          }
        } catch (err) {
          console.error(`Failed to fetch target user profile for ID ${targetUserId}:`, err);
        }
      };

      fetchTargetUserProfile();
    }
  }, [targetUserId, isLoadingUsers]);

  // 4. Fetch Message History from Backend when Active User Changes
  useEffect(() => {
    if (!activeUser?.id) {
      setChatHistory([]);
      return;
    }

    let isMounted = true;

    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const response = await api.get(`/messages/${activeUser.id}`);
        if (!isMounted) return;

        const rawHistory = response.data?.data || response.data || [];

        const normalizedHistory = rawHistory.map((m) => ({
          id: m.id,
          senderId: String(m.sender_id || m.senderId),
          receiverId: String(m.receiver_id || m.receiverId),
          content: m.content,
          createdAt: m.created_at || m.createdAt || m.timestamp,
        }));

        setChatHistory(normalizedHistory);
      } catch (err) {
        if (!isMounted) return;
        console.error(`Failed to load chat history with user ID ${activeUser.id}:`, err);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [activeUser?.id]);

  // 5. Select User Handler (State Update + Instant Navbar Dispatch + Dual API Fallback)
  const handleSelectUser = async (selectedUser) => {
    if (!selectedUser?.id) return;

    const currentUnread = Number(
      selectedUser.unreadCount ?? selectedUser.unread_count ?? selectedUser.unread ?? 0
    );

    setActiveUser(selectedUser);

    // Reset unread counter locally in React state
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        String(u.id) === String(selectedUser.id)
          ? { ...u, unreadCount: 0, unread_count: 0, unread: 0 }
          : u
      )
    );

    // Notify Navbar immediately via CustomEvent to clear badge counter
    if (currentUnread > 0) {
      window.dispatchEvent(
        new CustomEvent('chat:read', {
          detail: { clearedCount: currentUnread, userId: selectedUser.id },
        })
      );
    }

    // Backend Read Sync with Primary & Fallback API Routing
    try {
      await api.put(`/messages/read/${selectedUser.id}`);
    } catch (primaryErr) {
      console.warn(
        `Primary endpoint /messages/read/${selectedUser.id} failed. Retrying fallback endpoint...`,
        primaryErr
      );
      try {
        await api.post('/messages/mark-read', { senderId: selectedUser.id });
      } catch (secondaryErr) {
        console.error(
          `All mark-as-read API attempts failed for user ${selectedUser.id}:`,
          secondaryErr
        );
        // Force Navbar to refresh total count from source if API fails
        window.dispatchEvent(new CustomEvent('chat:refresh_unread'));
      }
    }
  };

  // 6. Filter WebSocket Messages for Current Active Session
  const activeWsMessages = useMemo(() => {
    if (!activeUser || !currentUser) return [];

    return liveWsMessages.filter((m) => {
      const sender = String(m.sender_id || m.senderId || '');
      const receiver = String(m.receiver_id || m.receiverId || '');

      const currId = String(currentUser.id);
      const actId = String(activeUser.id);

      return (
        (sender === actId && (receiver === currId || receiver === 'me')) ||
        ((sender === currId || sender === 'me') && receiver === actId)
      );
    });
  }, [liveWsMessages, activeUser, currentUser]);

  // 7. Deduplicate & Combine DB Chat History with Live WS Messages
  const currentChatMessages = useMemo(() => {
    const historyIds = new Set(
      chatHistory
        .map((m) => (m.id !== undefined && m.id !== null ? String(m.id) : null))
        .filter(Boolean)
    );

    const uniqueWsMessages = activeWsMessages.filter((m) => {
      if (!m.id) return true;
      return !historyIds.has(String(m.id));
    });

    return [...chatHistory, ...uniqueWsMessages];
  }, [chatHistory, activeWsMessages]);

  // 8. Sort Contacts by Latest Timestamp (Newest First) & Apply Search Filter
  const sortedAndFilteredUsers = useMemo(() => {
    let list = [...users];

    if (searchQuery.trim()) {
      list = list.filter((u) =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return list.sort((a, b) => {
      const timeA = new Date(
        a.lastMessageTime || a.last_message_time || a.updated_at || a.created_at || 0
      ).getTime();
      const timeB = new Date(
        b.lastMessageTime || b.last_message_time || b.updated_at || b.created_at || 0
      ).getTime();

      return timeB - timeA;
    });
  }, [users, searchQuery]);

  // Send Message Handler
  const handleSendMessage = async (text) => {
    if (!activeUser?.id || !text.trim()) return;
    
    // 1. Emit real-time frame
    sendMessage(activeUser.id, text);

    // 2. Optimistically update sidebar conversation preview & timestamp
    const nowISO = new Date().toISOString();
    setUsers((prevUsers) => {
      const activeIdStr = String(activeUser.id);
      const existingIndex = prevUsers.findIndex((u) => String(u.id) === activeIdStr);

      if (existingIndex !== -1) {
        const updatedUsers = [...prevUsers];
        const targetUser = {
          ...updatedUsers[existingIndex],
          lastMessage: text,
          lastMessageTime: nowISO,
        };
        updatedUsers.splice(existingIndex, 1);
        return [targetUser, ...updatedUsers];
      }
      return prevUsers;
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 overflow-hidden">
      {/* Network Connection Banner */}
      <div
        className={`px-4 py-1.5 text-xs text-center font-medium flex items-center justify-center gap-2 transition-colors ${
          isConnected
            ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-100'
            : 'bg-rose-50 text-rose-700 border-b border-rose-100'
        }`}
      >
        {isConnected ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span>Connected to Real-Time Messaging Server</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span>Connection Lost — Reconnecting automatically...</span>
          </>
        )}
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 md:p-6 flex overflow-hidden">
        <div className="flex-1 flex bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">
          
          {/* Left Sidebar: Search & User Conversation List */}
          <div
            className={`w-full sm:w-80 md:w-96 border-r border-gray-200 flex flex-col bg-white ${
              activeUser ? 'hidden sm:flex' : 'flex'
            }`}
          >
            <div className="p-4 border-b border-gray-100">
              <h1 className="text-xl font-bold text-gray-900 mb-3">Messages</h1>
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingUsers ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="text-sm font-medium">Loading contacts...</span>
                </div>
              ) : fetchError ? (
                <div className="p-4 text-center text-rose-500 text-sm flex flex-col items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  <p>{fetchError}</p>
                </div>
              ) : sortedAndFilteredUsers.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  {searchQuery
                    ? 'No members match your search.'
                    : 'No other community members found.'}
                </div>
              ) : (
                <UserList
                  users={sortedAndFilteredUsers}
                  activeUser={activeUser}
                  onSelectUser={handleSelectUser}
                  onlineUsers={onlineUsers}
                  typingUsers={typingUsers}
                />
              )}
            </div>
          </div>

          {/* Right Area: Main Chat Window & Input Area */}
          <div
            className={`flex-1 flex flex-col bg-gray-50/50 ${
              !activeUser ? 'hidden sm:flex' : 'flex'
            }`}
          >
            {activeUser ? (
              <>
                <div className="sm:hidden p-3 bg-white border-b border-gray-200 flex items-center gap-2">
                  <button
                    onClick={() => setActiveUser(null)}
                    className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <span className="font-semibold text-sm text-gray-800">
                    Back to Messages
                  </span>
                </div>

                {isLoadingHistory ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-medium">
                      Loading conversation history...
                    </span>
                  </div>
                ) : (
                  <ChatWindow
                    activeUser={activeUser}
                    messages={currentChatMessages}
                    isTyping={Boolean(typingUsers[String(activeUser.id)] || typingUsers[activeUser.id])}
                    currentUser={currentUser}
                  />
                )}
                <MessageInput
                  onSend={handleSendMessage}
                  onTyping={(isTyping) => sendTypingStatus(activeUser.id, isTyping)}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Your Messages</h3>
                <p className="text-sm max-w-sm">
                  Select a community member from the sidebar to start a real-time conversation.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default ChatPage;