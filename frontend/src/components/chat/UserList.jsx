import React, { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

/**
 * Robust image URL builder that handles full server paths,
 * relative paths, and direct http/https URLs.
 */
const getImageUrl = (mediaInput) => {
  if (!mediaInput) return null;
  let mediaUrl = typeof mediaInput === 'object'
    ? (mediaInput.url || mediaInput.path || mediaInput.src || '')
    : mediaInput;

  if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) return null;

  // Direct remote, blob, or base64 URLs
  if (
    mediaUrl.startsWith('http://') ||
    mediaUrl.startsWith('https://') ||
    mediaUrl.startsWith('blob:') ||
    mediaUrl.startsWith('data:')
  ) {
    return mediaUrl;
  }

  // Convert Windows backslashes to standard web forward slashes
  let cleanPath = mediaUrl.replace(/\\/g, '/');

  // Strip local disk paths (e.g. /Users/.../backend/uploads/avatar.png -> /uploads/avatar.png)
  if (cleanPath.includes('/uploads/')) {
    cleanPath = cleanPath.substring(cleanPath.indexOf('/uploads/'));
  } else if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  const API_BASE = import.meta.env.VITE_API_URL || '';
  return API_BASE ? `${API_BASE}${cleanPath}` : cleanPath;
};

// Sub-component that manages image loading & fallback state cleanly
const UserAvatar = ({ user, isOnline }) => {
  const [imgError, setImgError] = useState(false);
  const rawAvatar = 
    user.avatar_url || 
    user.avatarUrl || 
    user.avatar || 
    user.profile_pic || 
    user.profilePic;

  const avatarUrl = getImageUrl(rawAvatar);

  // Reset error state if user or avatar changes
  useEffect(() => {
    setImgError(false);
  }, [rawAvatar]);

  return (
    <div className="relative shrink-0 w-11 h-11">
      {avatarUrl && !imgError ? (
        <img
          src={avatarUrl}
          alt={user.name || 'User'}
          className="w-11 h-11 rounded-full object-cover border border-gray-200 shadow-xs"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-xs text-base">
          {user.name?.[0]?.toUpperCase() || 'U'}
        </div>
      )}
      <span
        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
          isOnline ? 'bg-emerald-500' : 'bg-gray-300'
        }`}
      />
    </div>
  );
};

export const UserList = ({
  users = [],
  activeUser,
  selectedUser, // Fallback alias support
  onSelectUser,
  onlineUsers,
  typingUsers = {},
}) => {
  const currentActive = activeUser || selectedUser;

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

  if (!users || users.length === 0) {
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
    <div className="divide-y divide-gray-100 overflow-y-auto">
      {users.map((user) => {
        const isOnline = checkIsOnline(user.id);
        
        // Strict string conversion check prevents Number vs String ID comparison bugs
        const isSelected = currentActive && String(currentActive.id) === String(user.id);

        const isTyping = Boolean(typingUsers?.[String(user.id)] || typingUsers?.[Number(user.id)]);

        const rawTime = user.lastMessageTime || user.last_message_time || user.updated_at || user.created_at;
        const formattedTime = rawTime
          ? new Date(rawTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null;

        const unreadCount = Number(user.unreadCount ?? user.unread_count ?? user.unread ?? 0);
        const hasUnread = unreadCount > 0 && !isSelected;

        return (
          <div
            key={user.id}
            onClick={() => onSelectUser(user)}
            className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors relative ${
              isSelected
                ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                : hasUnread
                ? 'bg-indigo-50/40 hover:bg-indigo-50/60 border-l-4 border-indigo-500'
                : 'hover:bg-gray-50'
            }`}
          >
            {/* Avatar Component */}
            <UserAvatar user={user} isOnline={isOnline} />

            {/* User Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>
                  {user.name}
                </p>
                {formattedTime && (
                  <span className={`text-[10px] shrink-0 ml-1 ${hasUnread ? 'font-bold text-indigo-600' : 'text-gray-400'}`}>
                    {formattedTime}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-1">
                <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                  {isTyping ? (
                    <span className="text-indigo-600 font-medium animate-pulse">typing...</span>
                  ) : (
                    user.lastMessage || user.last_message || user.current_position || user.role || (isOnline ? 'Online' : 'Offline')
                  )}
                </p>

                {/* Unread Counter Badge */}
                {hasUnread && (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full min-w-[18px] text-center shadow-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};