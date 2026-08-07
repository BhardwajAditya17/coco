const express = require('express');
const { 
  getAllUsers,
  getProfile, 
  updateProfile, 
  toggleConnection, 
  getUserActivities 
} = require('../controllers/userController');
const { protect, requireKyc } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/localUploadMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const followRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

// Require both authentication AND verified KYC for user routes
router.use(protect, requireKyc);

// 👈 1. Root route MUST be defined before /:id parameter routes
router.get('/', getAllUsers);

// 2. Profile by ID or alias
router.get('/:id', getProfile);

// 3. Update user profile
router.put(
  '/:id', 
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'aadhaar_doc', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]), 
  updateProfile
);

// 4. Follow / Unfollow
router.post('/:id/follow', followRateLimiter, toggleConnection);

// 5. User activities
router.get('/:id/activities', getUserActivities);

module.exports = router;