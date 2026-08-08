import React from 'react';
import { Users, UserCheck, UserX, FileText, AlertTriangle, ArrowRight } from 'lucide-react';

export const OverviewTab = ({ stats, loading, onNavigateTab }) => {
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Loading system analytics...
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Registered Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'bg-blue-500',
      action: () => onNavigateTab('users'),
    },
    {
      title: 'Active Accounts',
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: 'bg-emerald-500',
      action: () => onNavigateTab('users'),
    },
    {
      title: 'Banned Accounts',
      value: stats?.bannedUsers ?? 0,
      icon: UserX,
      color: 'bg-rose-500',
      action: () => onNavigateTab('users'),
    },
    {
      title: 'Total Feed Posts',
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      color: 'bg-indigo-500',
      action: null,
    },
    {
      title: 'Flagged Content Alerts',
      value: stats?.flaggedPosts ?? 0,
      icon: AlertTriangle,
      color: stats?.flaggedPosts > 0 ? 'bg-amber-500' : 'bg-gray-400',
      action: () => onNavigateTab('moderation'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">System Overview</h2>
        <p className="text-sm text-gray-500">Real-time health and key performance indicators.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
                  <p className="text-3xl font-extrabold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`p-3.5 rounded-xl text-white ${card.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              {card.action && (
                <button
                  onClick={card.action}
                  className="mt-4 inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-800 gap-1 pt-2 border-t border-gray-100"
                >
                  Manage View <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};