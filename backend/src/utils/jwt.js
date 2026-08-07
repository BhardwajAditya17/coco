const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generates a JSON Web Token for a user.
 * @param {Object|string|number} payload - User object or user ID to encode.
 * @returns {string} - Signed JWT token string.
 */
const generateToken = (payload) => {
  const tokenPayload = typeof payload === 'object' && payload !== null 
    ? { id: payload.id, role: payload.role } 
    : { id: payload };

  return jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Verifies a JSON Web Token.
 * @param {string} token - The JWT token string to verify.
 * @returns {Object} - The decoded token payload.
 */
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  generateToken,
  verifyToken,
};