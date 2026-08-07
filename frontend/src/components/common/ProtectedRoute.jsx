import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
// Assume you have an AuthContext created to manage login state
import { useAuth } from '../../hooks/useAuth'; 

const ProtectedRoute = ({ allowedRoles = ['user', 'admin'] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  // Not logged in? Send to login page, but remember where they were trying to go
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in, but wrong role? (e.g., a standard user trying to view the Admin Dashboard)
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Renders the child routes (e.g., FeedPage, AdminDashboard)
  return <Outlet />;
};

export default ProtectedRoute;