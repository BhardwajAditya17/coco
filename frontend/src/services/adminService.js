import api from './api';

const adminService = {
  /**
   * Fetch high-level analytics for the admin dashboard
   */
  getDashboardStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  /**
   * Fetch users whose Aadhaar/NGO verification is pending
   */
  getPendingVerifications: async () => {
    const response = await api.get('/admin/verifications/pending');
    return response.data;
  },

  /**
   * Approve or reject a user's verification request
   * @param {string} userId 
   * @param {'approve' | 'reject'} action 
   */
  verifyUser: async (userId, action) => {
    const response = await api.put(`/admin/verifications/${userId}/${action}`);
    return response.data;
  }
};

export default adminService;