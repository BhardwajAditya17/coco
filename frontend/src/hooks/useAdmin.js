import { useState, useCallback, useEffect } from 'react';
import adminService from '../services/adminService';

export const useAdmin = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilters, setUserFilters] = useState({ search: '', role: '', status: '', page: 1, limit: 10 });
  const [userPagination, setUserPagination] = useState({ total: 0, totalPages: 1 });

  // Moderation state
  const [flaggedPosts, setFlaggedPosts] = useState([]);
  const [moderationLoading, setModerationLoading] = useState(false);
  const [moderationPage, setModerationPage] = useState(1);
  const [moderationPagination, setModerationPagination] = useState({ total: 0, totalPages: 1 });

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({ total: 0, totalPages: 1 });

  const [error, setError] = useState(null);

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setError(null);
    try {
      const res = await adminService.getStats();
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load system stats');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setError(null);
    try {
      const res = await adminService.getUsers(userFilters);
      setUsers(res.data);
      if (res.pagination) setUserPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [userFilters]);

  // Fetch Flagged Posts
  const fetchFlaggedPosts = useCallback(async () => {
    setModerationLoading(true);
    setError(null);
    try {
      const res = await adminService.getFlaggedPosts({ page: moderationPage, limit: 10 });
      setFlaggedPosts(res.data);
      if (res.pagination) setModerationPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load flagged posts');
    } finally {
      setModerationLoading(false);
    }
  }, [moderationPage]);

  // Fetch Audit Logs
  const fetchAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setError(null);
    try {
      const res = await adminService.getAuditLogs({ page: auditPage, limit: 15 });
      setAuditLogs(res.data);
      if (res.pagination) setAuditPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage]);

  // User Actions
  const handleToggleUserStatus = async (userId, isBanned, reason) => {
    try {
      await adminService.updateUserStatus(userId, isBanned, reason);
      await fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleUpdateRole = async (userId, role) => {
    try {
      await adminService.updateUserRole(userId, role);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user?')) return;
    try {
      await adminService.deleteUser(userId);
      await fetchUsers();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Moderation Actions
  const handleDeletePost = async (postId, reason) => {
    try {
      await adminService.deletePost(postId, reason);
      await fetchFlaggedPosts();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const handleDismissFlags = async (postId) => {
    try {
      await adminService.dismissPostFlags(postId);
      await fetchFlaggedPosts();
      fetchStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dismiss flags');
    }
  };

  // Auto-fetch data based on active tab
  useEffect(() => {
    if (activeTab === 'overview') fetchStats();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'moderation') fetchFlaggedPosts();
    if (activeTab === 'audit') fetchAuditLogs();
  }, [activeTab, fetchStats, fetchUsers, fetchFlaggedPosts, fetchAuditLogs]);

  return {
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
    moderationPage,
    setModerationPage,
    moderationPagination,
    auditLogs,
    auditLoading,
    auditPage,
    setAuditPage,
    auditPagination,
    error,
    handleToggleUserStatus,
    handleUpdateRole,
    handleDeleteUser,
    handleDeletePost,
    handleDismissFlags,
    refreshCurrentTab: () => {
      if (activeTab === 'overview') fetchStats();
      if (activeTab === 'users') fetchUsers();
      if (activeTab === 'moderation') fetchFlaggedPosts();
      if (activeTab === 'audit') fetchAuditLogs();
    },
  };
};