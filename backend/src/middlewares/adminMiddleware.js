/**
 * Middleware to restrict route access strictly to users with 'ADMIN' role.
 * Expects protect / authMiddleware to have executed prior and attached req.user.
 */
const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const userRole = (req.user.role || '').toUpperCase();

    if (userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin authorization required',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during admin verification',
      error: error.message,
    });
  }
};

module.exports = { 
  adminMiddleware,
  admin: adminMiddleware // Export alias
};