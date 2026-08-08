import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { SocketProvider } from './context/SocketContext';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';
import ProfileSummaryPage from './pages/ProfileSummaryPage';
import KycPage from './pages/KycPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ChatPage from './pages/ChatPage';
import CommunityPage from './pages/CommunityPage';
import NotificationsPage from './pages/NotificationsPage';

// Components
import Navbar from './components/common/Navbar';

/**
 * Route Guard Component
 * Handles authentication, verification enforcement, and role-based permissions
 */
const ProtectedRoute = ({ allowedRoles, requireKyc = true }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium">Loading application...</div>
      </div>
    );
  }

  // 1. Must be logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const kycStatus = (user?.aadhaar_status || user?.aadhaarStatus || '').toLowerCase();

  // 2. Check Verification status if required
  if (requireKyc && kycStatus !== 'verified') {
    return <Navigate to="/kyc" replace />;
  }

  // 3. Check role-based access
  if (
    allowedRoles &&
    user &&
    !allowedRoles.map((r) => r.toLowerCase()).includes(user.role?.toLowerCase())
  ) {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
};

/**
 * Global Main Layout for Standard App Pages (Includes Standard Navbar)
 */
const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
};

/**
 * Dedicated Layout for Admin Portal (No Standard Navbar)
 */
const AdminLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
};

/**
 * Dynamic Root Redirector
 * Routes authenticated users based on verification status and role
 */
const RootRedirect = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const kycStatus = (user?.aadhaar_status || user?.aadhaarStatus || '').toLowerCase();

  // Force unverified users to complete verification first
  if (kycStatus !== 'verified') {
    return <Navigate to="/kyc" replace />;
  }

  return user?.role?.toLowerCase() === 'admin' ? (
    <Navigate to="/admin" replace />
  ) : (
    <Navigate to="/feed" replace />
  );
};

function App() {
  return (
    <SocketProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Authenticated Routes (Requires Login) */}
        <Route element={<ProtectedRoute requireKyc={false} />}>
          {/* Standalone Verification Route (No Navbar) */}
          <Route path="/kyc" element={<KycPage />} />

          {/* Standard Layout Wrapper (Renders Standard Navbar for user pages) */}
          <Route element={<MainLayout />}>
            <Route element={<ProtectedRoute requireKyc={true} />}>
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/profile/:id" element={<ProfilePage />} />
              <Route path="/profilesummary/:id" element={<ProfileSummaryPage />} />
            </Route>
          </Route>

          {/* Admin Portal Layout (AdminDashboardPage renders AdminNavbar) */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} requireKyc={true} />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Route>
          </Route>
        </Route>

        {/* Dynamic Root Route */}
        <Route path="/" element={<RootRedirect />} />

        {/* Catch-all Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SocketProvider>
  );
}

export default App;