// import { useState, useCallback } from 'react';
// import adminService from '../services/adminService';

// export const useAdmin = () => {
//   const [stats, setStats] = useState(null);
//   const [pendingUsers, setPendingUsers] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const fetchDashboardData = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       // Run both network requests concurrently
//       const [statsData, pendingData] = await Promise.all([
//         adminService.getDashboardStats(),
//         adminService.getPendingVerifications()
//       ]);

//       setStats(statsData);
//       setPendingUsers(pendingData);
//     } catch (err) {
//       setError(err.message || 'Failed to fetch admin dashboard data');
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   const handleVerification = useCallback(async (userId, action) => {
//     try {
//       await adminService.verifyUser(userId, action);
      
//       // Remove the user from the pending list in the UI immediately
//       setPendingUsers((prev) => prev.filter(user => user.id !== userId));
//     } catch (err) {
//       console.error(`Verification error:`, err);
//       throw err;
//     }
//   }, []);

//   return {
//     stats,
//     pendingUsers,
//     isLoading,
//     error,
//     fetchDashboardData,
//     approveUser: (userId) => handleVerification(userId, 'approve'),
//     rejectUser: (userId) => handleVerification(userId, 'reject')
//   };
// };


import { useState, useCallback } from 'react';
// We are temporarily commenting out the real API service
// import adminService from '../services/adminService';

export const useAdmin = () => {
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Simulate a realistic network delay (800ms)
      await new Promise(resolve => setTimeout(resolve, 800));

      // 2. Provide mock stats
      setStats({
        totalUsers: 1420,
        activeNgos: 84,
      });

      // 3. Provide mock pending verifications
      setPendingUsers([
        { 
          id: 'u1', 
          name: 'Hope Foundation', 
          email: 'contact@hope.org', 
          role: 'ngo',
          idNumber: 'NGO-2023-8891'
        },
        { 
          id: 'u2', 
          name: 'Jane Smith', 
          email: 'jane.smith@example.com', 
          role: 'user',
          idNumber: 'A1B2-C3D4-E5F6'
        }
      ]);
    } catch (err) {
      setError(err.message || 'Failed to fetch admin dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleVerification = useCallback(async (userId, action) => {
    try {
      // Simulate network request to approve/reject
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove the user from the UI locally
      setPendingUsers((prev) => prev.filter(user => user.id !== userId));
      console.log(`Successfully ${action}d user ${userId}`);
    } catch (err) {
      console.error(`Verification error:`, err);
      throw err;
    }
  }, []);

  return {
    stats,
    pendingUsers,
    isLoading,
    error,
    fetchDashboardData,
    approveUser: (userId) => handleVerification(userId, 'approve'),
    rejectUser: (userId) => handleVerification(userId, 'reject')
  };
};