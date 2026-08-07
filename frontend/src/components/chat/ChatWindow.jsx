import React, { useEffect, useRef } from 'react';
import { User, Send, CheckCheck } from 'lucide-react';

const getImageUrl = (mediaInput) => {
  if (!mediaInput) return null;
  let mediaUrl = typeof mediaInput === 'object'
    ? (mediaInput.url || mediaInput.path || mediaInput.src || '')
    : mediaInput;

  if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) return null;

  if (
    mediaUrl.startsWith('http://') ||
    mediaUrl.startsWith('https://') ||
    mediaUrl.startsWith('blob:') ||
    mediaUrl.startsWith('data:')
  ) {
    return mediaUrl;
  }

  let cleanPath = mediaUrl.replace(/\\/g, '/');
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  return `http://localhost:5002${cleanPath}`;
};

export const ChatWindow = ({ activeUser, messages = [], isTyping = false, currentUser }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!activeUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 p-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
          <User className="w-8 h-8" />
        </div>
        <p className="text-sm font-medium">Select a contact to start messaging</p>
      </div>
    );
  }

  const formatTime = (rawDate) => {
    if (!rawDate) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const dateObj = typeof rawDate === 'number' ? new Date(rawDate) : new Date(rawDate);
    if (isNaN(dateObj.getTime())) {
      return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeAvatarUrl = getImageUrl(activeUser.avatar_url || activeUser.avatarUrl);

  return (
    <div className="flex-1 flex flex-col bg-slate-50/60 h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            {activeAvatarUrl ? (
              <img
                src={activeAvatarUrl}
                alt={activeUser.name}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-xs">
                {activeUser.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {activeUser.name}
            </h3>
            <p className="text-xs text-gray-500">
              {activeUser.current_position || activeUser.role || 'Community Member'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
            <Send className="w-8 h-8 text-indigo-300" />
            <p className="text-xs font-medium">No messages yet. Say hello to {activeUser.name}!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const messageSender = String(msg.senderId || msg.sender_id || msg.SenderID || '');
            const currentUserId = String(currentUser?.id || '');

            const isMe =
              messageSender === 'me' ||
              (currentUserId !== '' && messageSender === currentUserId);

            const rawTimestamp = msg.createdAt || msg.created_at || msg.timestamp;
            const messageTime = formatTime(rawTimestamp);

            return (
              <div
                key={msg.id || `${messageSender}-${rawTimestamp}-${index}`}
                className={`w-full flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-end gap-2 max-w-[80%] sm:max-w-md ${
                    isMe ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {!isMe && (
                    <div className="shrink-0 mb-1">
                      {activeAvatarUrl ? (
                        <img
                          src={activeAvatarUrl}
                          alt={activeUser.name}
                          className="w-7 h-7 rounded-full object-cover border border-gray-200 shadow-xs"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shadow-xs">
                          {activeUser.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm transition-all ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>

                    <div
                      className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] font-medium ${
                        isMe ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      <span>{messageTime}</span>
                      {isMe && <CheckCheck className="w-3.5 h-3.5 text-indigo-200" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {isTyping && (
          <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium bg-white border border-slate-200 rounded-full px-3.5 py-1.5 w-fit shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
            </span>
            <span>{activeUser.name} is typing...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>
    </div>
  );
};