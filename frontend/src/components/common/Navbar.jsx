import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
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
import { cn } from '../../utils/cn';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  // Reusable NavLink styling function to keep styling and height consistent
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
              
              {/* 1. Feed */}
              <NavLink to="/feed" className={({ isActive }) => getNavLinkClass(isActive)}>
                <LayoutGrid className="w-4 h-4" />
                <span>Feed</span>
              </NavLink>

              {/* 2. Community */}
              <NavLink to="/community" className={({ isActive }) => getNavLinkClass(isActive)}>
                <Users className="w-4 h-4" />
                <span>Community</span>
              </NavLink>

              {/* 3. Messages / Chat */}
              <NavLink to="/chat" className={({ isActive }) => getNavLinkClass(isActive)}>
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </NavLink>

              {/* 4. Notifications */}
              <button 
                className="relative px-3.5 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all flex items-center gap-2 text-xs font-semibold h-9 cursor-pointer"
                aria-label="Notifications"
              >
                <div className="relative flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
                </div>
                <span>Notifications</span>
              </button>

              {/* 5. Profile Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-gray-50 transition-all text-left cursor-pointer border border-transparent hover:border-gray-200 h-9"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
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

                      {user?.role === 'admin' && (
                        <Link
                          to="/admin"
                          onClick={() => setIsProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-gray-700 hover:bg-gray-50 hover:text-blue-600 font-medium transition-colors"
                        >
                          <Shield className="w-4 h-4 text-purple-600" />
                          Admin Panel
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
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900">{user?.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user?.role || 'Member'}</div>
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
                    "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                    isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat
                </NavLink>

                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                </button>

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

                {user?.role === 'admin' && (
                  <NavLink
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                      isActive ? "bg-purple-50 text-purple-700" : "text-gray-700 hover:bg-gray-50"
                    )}
                  >
                    <Shield className="w-4 h-4 text-purple-600" />
                    Admin Panel
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