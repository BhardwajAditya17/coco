import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Shield, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';

const Sidebar = ({ isCollapsed: controlledIsCollapsed, onToggleCollapse }) => {
  const { user, logout } = useAuth();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);

  // Support both controlled state (from FeedPage) and internal component state
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  // Safely normalize user role to lowercase; default to 'user' if undefined
  const userRole = user?.role ? String(user.role).toLowerCase() : 'user';

  const navItems = [
    { name: 'Feed', path: '/feed', icon: Home, roles: ['user', 'ngo', 'admin', 'volunteer', 'member'] },
    { name: 'Profile', path: `/profile/${user?.id || ''}`, icon: User, roles: ['user', 'ngo', 'admin', 'volunteer', 'member'] },
    { name: 'Admin Panel', path: '/admin', icon: Shield, roles: ['admin'] },
  ];

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col h-[calc(100vh-5rem)] border-r border-gray-200 bg-white sticky top-20 transition-all duration-300 ease-in-out shadow-sm rounded-xl overflow-hidden",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Collapse/Expand Toggle Button */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        {!isCollapsed && (
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
            Navigation
          </span>
        )}
        <button
          onClick={handleToggle}
          className={cn(
            "p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* User Mini Profile Badge (Shown when Expanded) */}
      {!isCollapsed && user && (
        <div className="p-3 mx-3 mt-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name || 'User'}</p>
            <p className="text-[11px] text-gray-500 capitalize truncate">{userRole}</p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1.5 mt-3">
        {navItems.map((item) => {
          // Case-insensitive role matching
          const isAllowed = !item.roles || item.roles.some((r) => r.toLowerCase() === userRole);
          if (!isAllowed) return null;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all group relative",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                )
              }
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isCollapsed ? "mx-auto" : "mr-3")} />

              {!isCollapsed && <span className="truncate">{item.name}</span>}

              {/* Tooltip on hover when collapsed */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-md">
                  {item.name}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Action */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={logout}
          className={cn(
            "flex items-center w-full px-3 py-2.5 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors group relative",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className={cn("w-5 h-5 flex-shrink-0", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span>Sign Out</span>}

          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2.5 py-1 bg-red-600 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-md">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;