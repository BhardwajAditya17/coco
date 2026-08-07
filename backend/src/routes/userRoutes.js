const express = require('express');
const { 
  getProfile, 
  updateProfile, 
  toggleConnection, 
  getUserActivities 
} = require('../controllers/userController');
const { protect, requireKyc } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/localUploadMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter specifically for the follow endpoint to prevent spam/botting
const followRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 follow/unfollow requests per minute
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Require both authentication AND verified KYC for all user/profile endpoints
router.use(protect, requireKyc);

// Get public profile
router.get('/:id', getProfile);

// Update user profile details (Supports avatar and document uploads)
router.put(
  '/:id', 
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'aadhaar_doc', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]), 
  updateProfile
);

// Follow / Unfollow a user or NGO
router.post('/:id/follow', followRateLimiter, toggleConnection);

// Get user activities (Posts, etc.) for the Profile Page timeline
router.get('/:id/activities', getUserActivities);

module.exports = router;