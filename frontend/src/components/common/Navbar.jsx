import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Bell, 
  Shield, 
  User, 
  LogOut, 
  MessageSquare, 
  Users, 
  LayoutGrid, 
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Button from '../common/Button';
import api from '../../services/api';
import { cn } from '../../utils/cn';

/**
 * Robust image URL builder that handles full local disk paths,
 * relative paths, direct http/https, blob, and base64 URLs.
 */
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

const Navbar = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  
  // Unread count states for Notifications and Chat Messages
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef(null);

  // Check if current user is an Admin (case-insensitive)
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Extract avatar from all possible database schema key variations
  const rawAvatar = 
    user?.avatar_url || 
    user?.avatarUrl || 
    user?.avatar || 
    user?.profile_pic || 
    user?.profilePic;

  const rawAvatarUrl = getImageUrl(rawAvatar);
  const userAvatar = !avatarError ? rawAvatarUrl : null;

  // Reset avatar error state whenever rawAvatar changes
  useEffect(() => {
    setAvatarError(false);
  }, [rawAvatar]);

  // 1. Fetch initial unread counts ONCE when authenticated
  useEffect(() => {
    if (loading || !isAuthenticated) return;

    let isMounted = true;

    const fetchInitialCounts = async () => {
      try {
        const [notifRes, chatRes] = await Promise.allSettled([
          api.get('/notifications/unread-count'),
          api.get('/messages/unread-count')
        ]);

        if (!isMounted) return;

        // Extract Notification Count
        if (notifRes.status === 'fulfilled') {
          const res = notifRes.value.data;
          const count = Number(res?.count ?? res?.data?.count ?? res?.unreadCount ?? 0);
          setUnreadCount(window.location.pathname === '/notifications' ? 0 : count);
        }

        // Extract Chat / Messages Count
        if (chatRes.status === 'fulfilled') {
          const res = chatRes.value.data;
          const count = Number(res?.count ?? res?.data?.count ?? res?.unreadCount ?? 0);
          setUnreadChatCount(count);
        }
      } catch (err) {
        console.error('Failed to fetch initial unread counts:', err);
      }
    };

    fetchInitialCounts();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, loading]);

  // 2. Clear notification route count when active
  useEffect(() => {
    if (location.pathname === '/notifications') {
      setUnreadCount(0);
    }
  }, [location.pathname]);

  // 3. Listen for direct chat-read & refresh events dispatched from ChatPage
  useEffect(() => {
    const handleChatRead = async (event) => {
      const clearedCount = Number(event.detail?.clearedCount || 0);
      
      // Update Chat badge count
      setUnreadChatCount((prev) => Math.max(0, prev - clearedCount));

      // Synchronize Notification badge count with backend
      try {
        const notifRes = await api.get('/notifications/unread-count');
        const res = notifRes.data;
        const count = Number(res?.count ?? res?.data?.count ?? res?.unreadCount ?? 0);
        setUnreadCount(location.pathname === '/notifications' ? 0 : count);
      } catch (err) {
        // Fallback: manually reduce notification badge if API sync fails
        setUnreadCount((prev) => Math.max(0, prev - clearedCount));
      }
    };

    const handleRefreshUnread = async () => {
      try {
        const [notifRes, chatRes] = await Promise.allSettled([
          api.get('/notifications/unread-count'),
          api.get('/messages/unread-count')
        ]);

        if (notifRes.status === 'fulfilled') {
          const res = notifRes.value.data;
          const count = Number(res?.count ?? res?.data?.count ?? res?.unreadCount ?? 0);
          setUnreadCount(location.pathname === '/notifications' ? 0 : count);
        }

        if (chatRes.status === 'fulfilled') {
          const res = chatRes.value.data;
          const count = Number(res?.count ?? res?.data?.count ?? res?.unreadCount ?? 0);
          setUnreadChatCount(count);
        }
      } catch (err) {
        console.error('Failed to refresh unread counts:', err);
      }
    };

    window.addEventListener('chat:read', handleChatRead);
    window.addEventListener('chat:refresh_unread', handleRefreshUnread);

    return () => {
      window.removeEventListener('chat:read', handleChatRead);
      window.removeEventListener('chat:refresh_unread', handleRefreshUnread);
    };
  }, [location.pathname]);

  // 4. Live WebSocket Notification Listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleLiveNotification = () => {
      if (location.pathname === '/notifications') {
        setUnreadCount(0);
      } else {
        setUnreadCount((prev) => prev + 1);
      }
    };

    window.addEventListener('ws:notification', handleLiveNotification);
    return () => window.removeEventListener('ws:notification', handleLiveNotification);
  }, [isAuthenticated, location.pathname]);

  // 5. Live WebSocket Chat Message Listener (Increments Chat Count)
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleLiveChatMessage = (event) => {
      const msgData = event.detail;
      const senderId = String(msgData?.senderId || msgData?.sender_id || '');
      const currentUserId = String(user?.id || '');

      // Only increment if message is from another user
      if (senderId && senderId !== currentUserId) {
        setUnreadChatCount((prev) => prev + 1);
      }
    };

    window.addEventListener('ws:chat_message', handleLiveChatMessage);
    return () => window.removeEventListener('ws:chat_message', handleLiveChatMessage);
  }, [isAuthenticated, user?.id]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    setIsProfileDropdownOpen(false);
    navigate('/login');
  };

  const getNavLinkClass = (isActive) =>
    cn(
      "px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer h-9",
      isActive
        ? "bg-blue-50 text-blue-700 shadow-2xs"
        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    );

  return (
    <nav className="fixed top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-xs group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">
              Community<span className="text-blue-600">Connect</span>
            </span>
          </Link>

          {/* Desktop Nav Items */}
          {isAuthenticated ? (
            <div className="hidden md:flex items-center gap-2">
              
              {/* Feed */}
              <NavLink to="/feed" className={({ isActive }) => getNavLinkClass(isActive)}>
                <LayoutGrid className="w-4 h-4" />
                <span>Feed</span>
              </NavLink>

              {/* Community */}
              <NavLink to="/community" className={({ isActive }) => getNavLinkClass(isActive)}>
                <Users className="w-4 h-4" />
                <span>Community</span>
              </NavLink>

              {/* Messages / Chat */}
              <NavLink to="/chat" className={({ isActive }) => getNavLinkClass(isActive)}>
                <div className="relative flex items-center justify-center">
                  <MessageSquare className="w-4 h-4" />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full ring-2 ring-white"></span>
                  )}
                </div>
                <span>Chat</span>
                {unreadChatCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 font-bold rounded-full">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                )}
              </NavLink>

              {/* Notifications */}
              <NavLink 
                to="/notifications" 
                className={({ isActive }) => getNavLinkClass(isActive)}
                onClick={() => setUnreadCount(0)}
              >
                <div className="relative flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                  )}
                </div>
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-rose-100 text-rose-600 font-bold rounded-full">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>

              {/* Profile Dropdown Toggle */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-expanded={isProfileDropdownOpen}
                  aria-label="User menu"
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-gray-50 transition-all text-left cursor-pointer border border-transparent hover:border-gray-200 h-9"
                >
                  {userAvatar ? (
                    <img 
                      src={userAvatar} 
                      alt={user?.name || 'User'} 
                      onError={() => setAvatarError(true)}
                      className="w-8 h-8 rounded-full object-cover border border-gray-200 shadow-2xs shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-gray-900 max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 transition-transform duration-200", isProfileDropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown Card */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-xs font-bold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to={`/profilesummary/${user?.id}`}
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        My Profile
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 font-bold transition-colors"
                        >
                          <Shield className="w-4 h-4 text-indigo-600" />
                          Admin Portal
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-1 mt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="text-xs font-semibold text-gray-700 hover:text-blue-600 px-3 py-2 transition-colors">
                Log in
              </Link>
              <Link to="/signup">
                <Button variant="primary" size="sm">Get Started</Button>
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 backdrop-blur-md px-4 pt-3 pb-6 space-y-3">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100 mb-2">
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt={user?.name || 'User'} 
                    onError={() => setAvatarError(true)}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-gray-900 truncate">{user?.name}</div>
                  <div className="text-xs text-gray-500 capitalize truncate">{user?.role || 'Member'}</div>
                </div>
              </div>

              <div className="space-y-1">
                <NavLink
                  to="/feed"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Feed
                </NavLink>

                <NavLink
                  to="/community"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Users className="w-4 h-4" />
                  Community
                </NavLink>

                <NavLink
                  to="/chat"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
                  </div>
                  {unreadChatCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-blue-600 text-white font-bold rounded-full">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </NavLink>

                <NavLink
                  to="/notifications"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setUnreadCount(0);
                  }}
                  className={({ isActive }) => cn(
                    "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive ? "bg-rose-50 text-rose-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-rose-500 text-white font-bold rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </NavLink>

                <NavLink
                  to={`/profilesummary/${user?.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </NavLink>

                {isAdmin && (
                  <NavLink
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-colors",
                      isActive ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    )}
                  >
                    <Shield className="w-4 h-4 text-indigo-600" />
                    Admin Portal
                  </NavLink>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="secondary" className="w-full justify-center">Log in</Button>
              </Link>
              <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="primary" size="sm" className="w-full justify-center">Sign up</Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;