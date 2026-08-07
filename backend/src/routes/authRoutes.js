const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const localUploadMiddleware = require('../middlewares/localUploadMiddleware');

const router = express.Router();

// Handle profile avatar upload during registration (Identity verification upload is handled separately in /kyc)
const registrationUploads = localUploadMiddleware.fields([
  { name: 'avatar', maxCount: 1 },
]);

// Public routes (Supports both /signup and /register)
router.post('/register', registrationUploads, register);
router.post('/signup', registrationUploads, register);
router.post('/login', login);

// Protected routes (requires valid JWT)
router.get('/me', protect, getMe);

module.exports = router;