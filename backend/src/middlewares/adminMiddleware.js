const { ROLES, HTTP_STATUS } = require('../utils/constants');

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: 'Access denied. Administrator privilege required.',
    });
  }
  next();
};

module.exports =  { requireAdmin, };