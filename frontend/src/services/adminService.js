import api from './api';

export const adminService = {
  // Fetch system-wide KPI metrics
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Fetch paginated user list with search & status/role filters
  getUsers: async (params = {}) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Toggle user ban status
  updateUserStatus: async (userId, isBanned, reason = '') => {
    const response = await api.patch(`/admin/users/${userId}/status`, { isBanned, reason });
    return response.data;
  },

  // Update user role (USER, MODERATOR, ADMIN)
  updateUserRole: async (userId, role) => {
    const response = await api.patch(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  // Delete a user account permanently
  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Fetch flagged posts
  getFlaggedPosts: async (params = {}) => {
    const response = await api.get('/admin/moderation/posts', { params });
    return response.data;
  },

  // Remove violating post
  deletePost: async (postId, reason = '') => {
    const response = await api.delete(`/admin/moderation/posts/${postId}`, {
      data: { reason },
    });
    return response.data;
  },

  // Dismiss report flags on a post
  dismissPostFlags: async (postId) => {
    const response = await api.patch(`/admin/moderation/posts/${postId}/dismiss`);
    return response.data;
  },

  // Fetch audit trail history
  getAuditLogs: async (params = {}) => {
    const response = await api.get('/admin/audit-logs', { params });
    return response.data;
  },
};

export default adminService;