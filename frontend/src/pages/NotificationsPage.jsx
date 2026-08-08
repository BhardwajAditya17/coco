import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  MessageSquare, 
  Heart, 
  MessageCircle, 
  Sparkles, 
  CheckCheck, 
  Trash2, 
  Loader2, 
  User as UserIcon,
  UserPlus,
  Eye
} from 'lucide-react';
import api from '../services/api';
import { cn } from '../utils/cn';

// 🖼️ Unified Image URL Helper (Matches ProfileSummaryPage)
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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';
  return `${API_BASE}${cleanPath}`;
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// 🛠️ Helper to normalize field names across REST and WebSocket payloads
const normalizeNotification = (n) => {
  if (!n) return null;

  // Resolve action subtype ('like', 'comment', 'follow', 'chat')
  const actionType = 
    n.notification_type || 
    n.notificationType || 
    n.action_type || 
    (n.type && n.type !== 'notification' ? n.type : 'system');

  return {
    id: n.id || n._id || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type: actionType,
    message: n.message || n.content || '',
    is_read: n.is_read ?? n.isRead ?? false,
    actor_id: n.actor_id || n.actorId || n.sender_id || n.senderId || '',
    actor_name: n.actor_name || n.actorName || n.sender_name || n.senderName || 'Someone',
    actor_avatar: n.actor_avatar || n.actorAvatar || n.sender_avatar || n.senderAvatar || null,
    target_id: n.target_id || n.targetId || n.postId || null,
    target_url: n.target_url || n.targetUrl || null,
    created_at: n.created_at || n.createdAt || n.timestamp || new Date().toISOString(),
  };
};

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications');
      const data = response.data?.data || response.data || [];
      
      if (Array.isArray(data)) {
        setNotifications(data.map(normalizeNotification));
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // 🔔 Real-time notification listener with Robust Deduplication
    const handleLiveNotification = (event) => {
      const rawNotif = event.detail;
      if (!rawNotif) return;

      const normalized = normalizeNotification(rawNotif);

      setNotifications((prev) => {
        // 1. Direct ID match
        const hasSameId = prev.some((n) => String(n.id) === String(normalized.id));
        if (hasSameId) return prev;

        // 2. Signature match (prevents duplicates from rapid WS pushes or redundant triggers)
        const isContentDuplicate = prev.some((n) => {
          const sameActor = String(n.actor_id) === String(normalized.actor_id);
          const sameType = n.type === normalized.type;
          const sameTarget = String(n.target_id) === String(normalized.target_id);
          const timeDiff = Math.abs(new Date(n.created_at) - new Date(normalized.created_at));

          return sameActor && sameType && sameTarget && timeDiff < 3000;
        });

        if (isContentDuplicate) return prev;

        return [normalized, ...prev];
      });
    };

    window.addEventListener('ws:notification', handleLiveNotification);
    return () => window.removeEventListener('ws:notification', handleLiveNotification);
  }, []);

  const handleNotificationClick = async (notif) => {
    // 1. Mark notification as read if unread and has a valid server ID
    if (!notif.is_read) {
      try {
        if (notif.id && !String(notif.id).startsWith('temp-')) {
          await api.patch(`/notifications/${notif.id}/read`);
        }
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }

    // 2. Navigate based on notification action type
    switch (notif.type) {
      case 'chat':
        navigate(`/chat?userId=${notif.actor_id}`);
        break;
      case 'like':
      case 'comment':
        navigate(`/feed?postId=${notif.target_id}`);
        break;
      case 'follow':
      case 'profile_view':
        navigate(`/profilesummary/${notif.actor_id}`);
        break;
      default:
        if (notif.target_url) navigate(notif.target_url);
        break;
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    e.stopPropagation();
    try {
      if (id && !String(id).startsWith('temp-')) {
        await api.delete(`/notifications/${id}`);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />;
      case 'comment':
        return <MessageCircle className="w-3.5 h-3.5 text-blue-500" />;
      case 'chat':
        return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-indigo-500" />;
      case 'profile_view':
        return <Eye className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50/60 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Notifications</h1>
                <p className="text-xs text-gray-500">Stay updated on interactions across your network</p>
              </div>
            </div>

            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer",
                filter === 'all'
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80"
              )}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer",
                filter === 'unread'
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80"
              )}
            >
              Unread ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 space-y-2 flex-col">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-xs">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-xs space-y-3">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No notifications yet</h3>
            <p className="text-xs text-gray-500">
              {filter === 'unread' 
                ? 'You have caught up with all notifications.' 
                : 'Activity related to your posts, follows, and chat will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notif) => {
              const avatar = getImageUrl(notif.actor_avatar);

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    "bg-white rounded-2xl p-4 border transition-all flex items-center gap-3 cursor-pointer group hover:shadow-md relative",
                    notif.is_read
                      ? "border-gray-200/80 opacity-85"
                      : "border-blue-200 bg-blue-50/30 font-medium"
                  )}
                >
                  {/* Actor Avatar with Graceful Fallback */}
                  <div className="relative shrink-0 w-10 h-10">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={notif.actor_name || 'User'}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextElementSibling) {
                            e.target.nextElementSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}

                    {/* Fallback Badge (shown if no avatar URL or if image load fails) */}
                    <div 
                      className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center"
                      style={{ display: avatar ? 'none' : 'flex' }}
                    >
                      {notif.actor_name?.[0]?.toUpperCase() || <UserIcon className="w-4 h-4" />}
                    </div>

                    {/* Notification Type Icon Overlay */}
                    <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-2xs border border-gray-100 z-10">
                      {getNotificationIcon(notif.type)}
                    </div>
                  </div>

                  {/* Notification Body */}
                  <div className="flex-1 min-w-0 pr-6">
                    <p className="text-xs text-gray-900 leading-relaxed">
                      <span className="font-bold text-gray-900">{notif.actor_name || 'Someone'}</span>{' '}
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {formatTimeAgo(notif.created_at)}
                    </span>
                  </div>

                  {/* Actions & Unread Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                    
                    <button
                      onClick={(e) => handleDeleteNotification(e, notif.id)}
                      title="Delete notification"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationsPage;