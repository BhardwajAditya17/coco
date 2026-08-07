const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/authMiddleware');
const { initiateOtp, verifyOtp } = require('../controllers/kycController');

const router = express.Router();

// Strict Rate Limiting: Prevent OTP spam & API credit depletion
const otpInitiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 3, // Max 3 requests per IP/user per window
  message: {
    success: false,
    message: 'Too many OTP initiation attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minutes
  max: 5, // Max 5 verification attempts per window
  message: {
    success: false,
    message: 'Too many invalid attempts. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes guarded with JWT auth & rate limits
router.post('/initiate-otp', protect, otpInitiateLimiter, initiateOtp);
router.post('/verify-otp', protect, otpVerifyLimiter, verifyOtp);

module.exports = router;