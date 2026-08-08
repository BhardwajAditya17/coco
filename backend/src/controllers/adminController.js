const adminService = require('../services/adminService');

const getStats = async (req, res, next) => {
  try {
    const stats = await adminService.getSystemStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, role, status } = req.query;
    const result = await adminService.getUsers({ page, limit, search, role, status });
    res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBanned, reason } = req.body;
    const adminId = req.user.id;

    const updatedUser = await adminService.updateUserStatus(adminId, id, isBanned, reason);

    res.status(200).json({
      success: true,
      message: `User successfully ${isBanned ? 'banned' : 'unbanned'}`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role parameter',
      });
    }

    const updatedUser = await adminService.updateUserRole(adminId, id, role);

    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    if (Number(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account',
      });
    }

    const result = await adminService.deleteUser(adminId, id);

    res.status(200).json({
      success: true,
      message: 'User account deleted',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getFlaggedPosts = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await adminService.getFlaggedPosts({ page, limit });

    res.status(200).json({
      success: true,
      data: result.posts,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    const result = await adminService.deletePost(adminId, id, reason);

    res.status(200).json({
      success: true,
      message: 'Post removed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const dismissPostFlags = async (req, res, next) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const updatedPost = await adminService.dismissPostFlags(adminId, id);

    res.status(200).json({
      success: true,
      message: 'Post flags dismissed',
      data: updatedPost,
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await adminService.getAuditLogs({ page, limit });

    res.status(200).json({
      success: true,
      data: result.auditLogs,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getFlaggedPosts,
  deletePost,
  dismissPostFlags,
  getAuditLogs,
};