import React from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2,
  Users,
  ShieldAlert,
  ClipboardList,
  LogOut,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminNavbar = ({ activeTab, setActiveTab, flaggedCount = 0 }) => {
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'moderation', label: 'Moderation', icon: ShieldAlert, badge: flaggedCount },
    { id: 'audit', label: 'Audit Logs', icon: ClipboardList },
  ];

  return (
    <nav className="bg-gray-900 text-white border-b border-gray-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand & Admin Badge */}
          <div className="flex items-center space-x-6">
            <Link to="/admin" className="flex items-center gap-2 font-black text-lg tracking-tight">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>
                Community<span className="text-indigo-400">Connect</span>
              </span>
              <span className="bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-md tracking-wider">
                Admin
              </span>
            </Link>

            {/* Desktop Tab Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-300 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {Boolean(tab.badge) && tab.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            <Link
              to="/feed"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg border border-gray-700 transition-colors"
              title="Return to Main Application"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Portal</span>
            </Link>

            <div className="h-4 w-px bg-gray-700" />

            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="hidden sm:inline font-medium">{user?.name}</span>
              <button
                onClick={logout}
                className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-gray-800 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View Navigation Bar */}
        <div className="md:hidden flex items-center space-x-2 py-2 overflow-x-auto no-scrollbar border-t border-gray-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {Boolean(tab.badge) && tab.badge > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;