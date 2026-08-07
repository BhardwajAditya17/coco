import React, { createContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Hydrate initial state directly from localStorage to prevent UI flickering on refresh
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);

  /**
   * Clears active session and storage
   */
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  // Initialize session & verify current token with backend
  useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('token');

      if (savedToken) {
        try {
          const response = await authService.getCurrentUser();
          // Safely resolve user object from { success: true, data: user }
          const authUser = response.data?.user || response.data || response.user;
          
          if (authUser) {
            setUser(authUser);
            localStorage.setItem('user', JSON.stringify(authUser));
          } else {
            logout();
          }
        } catch (err) {
          console.warn('Session expired or invalid token. Clearing session.');
          logout();
        }
      } else {
        logout();
      }
      setIsLoading(false);
    };

    initializeAuth();

    // Listen for global 401 unauthorized event from Axios interceptor
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth-unauthorized', handleUnauthorized);
    };
  }, [logout]);

  /**
   * Log in user
   */
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);

      // Backend returns: { success: true, token, data: userObject }
      const authUser = response.data?.user || response.data || response.user;
      const authToken = response.token || response.data?.token;

      if (!authToken || !authUser) {
        return { success: false, error: 'Invalid authentication response structure' };
      }

      setUser(authUser);
      setToken(authToken);

      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(authUser));

      return { success: true, user: authUser };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Login failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user (Supports JSON & FormData)
   */
  const signup = async (userData) => {
    setIsLoading(true);
    try {
      const response = await authService.signup(userData);

      // Backend returns: { success: true, token, data: userObject }
      const authUser = response.data?.user || response.data || response.user;
      const authToken = response.token || response.data?.token;

      if (authToken && authUser) {
        setUser(authUser);
        setToken(authToken);
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(authUser));
      }

      return { success: true, user: authUser };
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Signup failed';
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};