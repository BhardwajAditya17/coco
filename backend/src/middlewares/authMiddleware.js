const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { HTTP_STATUS, ROLES, AADHAAR_STATUS } = require('../utils/constants');

const protect = async (req, res, next) => {
  // 🔓 DEVELOPMENT AUTH BYPASS
  if (process.env.NODE_ENV === 'development' && process.env.DISABLE_AUTH === 'true') {
    req.user = {
      id: 'mock-user-id-123',
      email: 'dev@communityconnect.org',
      name: 'Dev Admin',
      role: ROLES?.ADMIN || 'ADMIN',
      aadhaar_status: AADHAAR_STATUS?.VERIFIED || 'verified',
      fee_status: 'paid',
      avatar_url: null,
    };
    return next();
  }

  // Standard Token Verification
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(HTTP_STATUS?.UNAUTHORIZED || 401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    const userId = typeof decoded.id === 'string' && !isNaN(Number(decoded.id))
      ? Number(decoded.id)
      : decoded.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        aadhaar_status: true,
        fee_status: true,
        avatar_url: true,
        current_position: true,
        location: true,
      },
    });

    if (!user) {
      return res.status(HTTP_STATUS?.UNAUTHORIZED || 401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS?.UNAUTHORIZED || 401).json({
        success: false,
        message: 'Invalid or expired token. Please log in again.',
      });
    }
    next(error);
  }
};

/**
 * KYC Verification Middleware
 * Requires `protect` to run first. Blocks unverified users from protected API endpoints.
 */
const requireKyc = (req, res, next) => {
  if (!req.user) {
    return res.status(HTTP_STATUS?.UNAUTHORIZED || 401).json({
      success: false,
      message: 'Unauthorized. Authentication required.',
    });
  }

  const kycStatus = (req.user.aadhaar_status || '').toLowerCase();
  const verifiedConstant = (AADHAAR_STATUS?.VERIFIED || 'verified').toLowerCase();

  if (kycStatus !== verifiedConstant) {
    return res.status(HTTP_STATUS?.FORBIDDEN || 403).json({
      success: false,
      message: 'Access denied. You must complete KYC identity verification first.',
      code: 'KYC_REQUIRED',
    });
  }

  next();
};

module.exports = { 
  protect, 
  authMiddleware: protect, // Export alias for naming flexibility
  requireKyc 
};