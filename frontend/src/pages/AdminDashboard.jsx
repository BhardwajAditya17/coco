import React, { useEffect } from 'react';
import { useAdmin } from '../hooks/useAdmin';
import StatsCard from '../components/admin/StatsCard';
import MemberApprovalTable from '../components/admin/MemberApprovalTable';
import Loader from '../components/common/Loader';

const AdminDashboard = () => {
  const { 
    stats, 
    pendingUsers, 
    isLoading, 
    error, 
    fetchDashboardData, 
    approveUser, 
    rejectUser 
  } = useAdmin();

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (isLoading) return <div className="p-8 flex justify-center"><Loader /></div>;
  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;
  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and moderation queue.</p>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard title="Total Users" value={stats.totalUsers} trend="+12%" />
        <StatsCard title="Active NGOs" value={stats.activeNgos} trend="+4%" />
        <StatsCard title="Pending Verifications" value={pendingUsers.length} alert={pendingUsers.length > 5} />
      </div>

      {/* Moderation Queue */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">Verification Queue</h2>
        </div>
        <div className="p-6">
          {pendingUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No pending verification requests.</p>
          ) : (
            <MemberApprovalTable 
              users={pendingUsers} 
              onApprove={approveUser} 
              onReject={rejectUser} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;