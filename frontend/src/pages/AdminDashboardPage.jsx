import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAdmin } from '../hooks/useAdmin';

// Substituted: Render AdminNavbar directly in place of standard Navbar + SubHeader
import { AdminNavbar } from '../components/admin/AdminNavbar';
import { OverviewTab } from '../components/admin/OverviewTab';
import { UsersTab } from '../components/admin/UsersTab';
import { ModerationTab } from '../components/admin/ModerationTab';
import { AuditLogsTab } from '../components/admin/AuditLogsTab';

export const AdminDashboardPage = () => {
  const { user, loading: authLoading } = useAuth();
  const {
    activeTab,
    setActiveTab,
    stats,
    statsLoading,
    users,
    usersLoading,
    userFilters,
    setUserFilters,
    userPagination,
    flaggedPosts,
    moderationLoading,
    moderationPagination,
    setModerationPage,
    auditLogs,
    auditLoading,
    auditPagination,
    setAuditPage,
    error,
    handleToggleUserStatus,
    handleUpdateRole,
    handleDeleteUser,
    handleDeletePost,
    handleDismissFlags,
  } = useAdmin();

  if (authLoading) {
    return <div className="p-8 text-center text-gray-500">Checking authorization...</div>;
  }

  // Restrict access strictly to ADMIN role
  if (!user || user.role !== 'ADMIN') {
    return <Navigate to="/feed" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Admin Navbar (Replaces standard Navbar) */}
      <AdminNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        flaggedCount={stats?.flaggedPosts || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium">
            {error}
          </div>
        )}

        {activeTab === 'overview' && (
          <OverviewTab stats={stats} loading={statsLoading} onNavigateTab={setActiveTab} />
        )}

        {activeTab === 'users' && (
          <UsersTab
            users={users}
            loading={usersLoading}
            filters={userFilters}
            setFilters={setUserFilters}
            pagination={userPagination}
            onToggleStatus={handleToggleUserStatus}
            onUpdateRole={handleUpdateRole}
            onDeleteUser={handleDeleteUser}
          />
        )}

        {activeTab === 'moderation' && (
          <ModerationTab
            posts={flaggedPosts}
            loading={moderationLoading}
            pagination={moderationPagination}
            setPage={setModerationPage}
            onDeletePost={handleDeletePost}
            onDismissFlags={handleDismissFlags}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogsTab
            logs={auditLogs}
            loading={auditLoading}
            pagination={auditPagination}
            setPage={setAuditPage}
          />
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;