const adminService = require('../services/adminService');

const getDashboardStats = async (req, res, next) => {
  try {
    const analytics = await adminService.getPlatformAnalytics();
    
    res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

const getPendingMembers = async (req, res, next) => {
  try {
    const pendingMembers = await adminService.getPendingMembers();
    
    res.status(200).json({
      success: true,
      data: pendingMembers,
    });
  } catch (error) {
    next(error);
  }
};

const updateKYCStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'KYC status is required.' });
    }

    const updatedMember = await adminService.updateMemberKYCStatus(userId, status);

    res.status(200).json({
      success: true,
      message: `User KYC status updated to ${status}.`,
      data: updatedMember,
    });
  } catch (error) {
    if (error.message === 'Invalid status provided.') {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { postId } = req.params;

    await adminService.deletePostById(postId);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully by Admin.',
    });
  } catch (error) {
    if (error.message === 'Post not found.') {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getPendingMembers,
  updateKYCStatus,
  deletePost,
};