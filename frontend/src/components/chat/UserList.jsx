import React from 'react';
import { MessageSquare } from 'lucide-react';

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

export const UserList = ({ users = [], activeUser, onSelectUser, onlineUsers }) => {
  const checkIsOnline = (userId) => {
    if (!onlineUsers) return false;

    const idStr = String(userId);
    const idNum = Number(userId);

    if (Array.isArray(onlineUsers)) {
      return onlineUsers.includes(idStr) || onlineUsers.includes(idNum);
    }

    if (onlineUsers instanceof Set) {
      return onlineUsers.has(idStr) || onlineUsers.has(idNum);
    }

    return false;
  };

  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
          <MessageSquare className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-gray-600">No conversations yet</p>
        <p className="text-xs text-gray-400">When you message someone, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {users.map((user) => {
        const isOnline = checkIsOnline(user.id);
        const isSelected = activeUser?.id === user.id;

        const rawTime = user.lastMessageTime || user.updated_at || user.created_at;
        const formattedTime = rawTime
          ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null;

        const avatarUrl = getImageUrl(user.avatar_url || user.avatarUrl);

        return (
          <div
            key={user.id}
            onClick={() => onSelectUser(user)}
            className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
              isSelected ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-gray-50'
            }`}
          >
            {/* Avatar & Online Badge */}
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.name}
                  className="w-11 h-11 rounded-full object-cover border border-gray-200"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-xs">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className="font-semibold text-gray-900 text-sm truncate">{user.name}</p>
                {formattedTime && (
                  <span className="text-[10px] text-gray-400 shrink-0 ml-1">{formattedTime}</span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate">
                {user.lastMessage || user.current_position || user.role || (isOnline ? 'Online' : 'Offline')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};