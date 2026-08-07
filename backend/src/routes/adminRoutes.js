const express = require('express');
const { 
  getDashboardStats, 
  getPendingMembers, 
  updateKYCStatus, 
  deletePost 
} = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware'); // Updated import

const router = express.Router();

// Apply both authentication and admin-role authorization
router.use(protect, requireAdmin); // Updated variable reference

// Get platform-wide statistics for the admin dashboard
router.get('/analytics', getDashboardStats);

// Fetch users who are awaiting manual verification or review
router.get('/members/pending', getPendingMembers);

// Manually approve/reject a user's KYC status
router.patch('/members/:userId/kyc', updateKYCStatus);

// Delete any post that violates platform guidelines
router.delete('/posts/:postId', deletePost);

module.exports = router;