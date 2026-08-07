import api from './api';

const authService = {
  /**
   * Log in a user and return response data ({ success, token, data })
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new user (Handles both JSON and Multipart FormData for file uploads)
   */
  signup: async (userData) => {
    const isFormData = userData instanceof FormData;
    const config = isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : {};

    const response = await api.post('/auth/signup', userData, config);
    return response.data;
  },

  /**
   * Alias for signup to maintain backwards compatibility
   */
  register: function (userData) {
    return this.signup(userData);
  },

  /**
   * Fetch current authenticated user profile using token
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  /**
   * Clean up client session storage on logout
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export default authService;