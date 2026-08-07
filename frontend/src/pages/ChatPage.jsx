import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { Search, Loader2, AlertCircle, Wifi, WifiOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { UserList } from '../components/chat/UserList';
import { ChatWindow } from '../components/chat/ChatWindow';
import { MessageInput } from '../components/chat/MessageInput';
import api from '../services/api';

const ChatPage = () => {
  const { user: currentUser, token: authToken } = useAuth();
  const token = authToken || localStorage.getItem('token');

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

  // WebSocket Connection Hook
  const {
    messages: liveWsMessages,
    onlineUsers,
    typingUsers,
    isConnected,
    sendMessage,
    sendTypingStatus
  } = useWebSocket(token, currentUser);

  // 1. Fetch Contacted Users / Recent Conversations
  useEffect(() => {
    const fetchContactedUsers = async () => {
      try {
        setIsLoadingUsers(true);
        setFetchError(null);

        const response = await api.get('/messages/conversations');
        const contactedData = response.data?.data || response.data || [];

        setUsers(contactedData);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
        setFetchError('Unable to load conversations.');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (currentUser?.id) {
      fetchContactedUsers();
    }
  }, [currentUser?.id]);

  // 2. Auto-select or inject Target User from URL or Router state
  useEffect(() => {
    if (!targetUserId || isLoadingUsers) return;

    const targetIdStr = String(targetUserId);
    const existingUser = users.find((u) => String(u.id) === targetIdStr);

    if (existingUser) {
      setActiveUser(existingUser);
    } else {
      // Uncontacted user logic: check state or fetch profile from backend
      if (recipientFromState && String(recipientFromState.id) === targetIdStr) {
        setUsers((prev) => [recipientFromState, ...prev.filter((u) => String(u.id) !== targetIdStr)]);
        setActiveUser(recipientFromState);
      } else {
        const fetchTargetUserProfile = async () => {
          try {
            const res = await api.get(`/users/${targetUserId}`);
            const userData = res.data?.data || res.data;
            if (userData) {
              setUsers((prev) => [userData, ...prev.filter((u) => String(u.id) !== targetIdStr)]);
              setActiveUser(userData);
            }
          } catch (err) {
            console.error('Unable to fetch target user profile:', err);
          }
        };

        fetchTargetUserProfile();
      }
    }
  }, [targetUserId, isLoadingUsers, recipientFromState]);

  // 3. Fetch Chat History from Database when Active User changes
  useEffect(() => {
    if (!activeUser?.id) {
      setChatHistory([]);
      return;
    }

    const fetchHistory = async () => {
      try {
        setIsLoadingHistory(true);
        const response = await api.get(`/messages/${activeUser.id}`);
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
        console.error('Failed to fetch chat history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeUser?.id]);

  // 4. Filter Live WebSocket Messages belonging to active user conversation
  const activeWsMessages = useMemo(() => {
    if (!activeUser || !currentUser) return [];

    return liveWsMessages.filter((m) => {
      const sender = String(m.sender_id || m.senderId || m.SenderID || '');
      const receiver = String(m.receiver_id || m.receiverId || m.ReceiverID || '');

      const currId = String(currentUser.id);
      const actId = String(activeUser.id);

      return (
        (sender === actId && (receiver === currId || receiver === 'me')) ||
        ((sender === currId || sender === 'me') && receiver === actId)
      );
    });
  }, [liveWsMessages, activeUser, currentUser]);

  // 5. Combine Historical DB Messages with Live WS Messages without duplicates
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

  // 6. Filter contacts by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    return users.filter((u) =>
      u.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [users, searchQuery]);

  // Send Message Handler
  const handleSendMessage = async (text) => {
    if (!activeUser?.id || !text.trim()) return;
    sendMessage(activeUser.id, text);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-gray-50 overflow-hidden">
      {/* Network Status Banner */}
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

          {/* Left Sidebar: Contact Search & User List */}
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
              ) : filteredUsers.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  {searchQuery ? 'No members match your search.' : 'No other community members found.'}
                </div>
              ) : (
                <UserList
                  users={filteredUsers}
                  activeUser={activeUser}
                  onSelectUser={setActiveUser}
                  onlineUsers={onlineUsers}
                />
              )}
            </div>
          </div>

          {/* Right Area: Chat Window */}
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
                  <span className="font-semibold text-sm text-gray-800">Back to Messages</span>
                </div>

                {isLoadingHistory ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs font-medium">Loading conversation history...</span>
                  </div>
                ) : (
                  <ChatWindow
                    activeUser={activeUser}
                    messages={currentChatMessages}
                    isTyping={typingUsers[activeUser.id] || false}
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