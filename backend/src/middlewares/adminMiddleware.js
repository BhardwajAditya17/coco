const jwt = require('jsonwebtoken');
const { ROLES, HTTP_STATUS } = require('../utils/constants');

/**
 * Middleware to verify JWT Bearer token and attach req.user
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <TOKEN>"

  if (!token) {
    return res.status(HTTP_STATUS?.UNAUTHORIZED || 401).json({
      success: false,
      message: 'Access denied. Authentication token required.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
    req.user = decoded; // Attach decoded user object { id, role, etc. }
    next();
  } catch (error) {
    return res.status(HTTP_STATUS?.UNAUTHORIZED || 401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

/**
 * Middleware to restrict route access to Admin users only
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(HTTP_STATUS?.FORBIDDEN || 403).json({
      success: false,
      message: 'Access denied. Administrator privilege required.',
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
};