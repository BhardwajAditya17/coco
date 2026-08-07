const userService = require('../services/userService');

const getProfile = async (req, res, next) => {
  try {
    let targetUserId = req.params.id;

    // Handle '/profile' or '/me' aliases dynamically
    if (!targetUserId || targetUserId === 'profile' || targetUserId === 'me') {
      targetUserId = req.user?.id;
    }

    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user context found.',
      });
    }

    const currentUserId = req.user?.id;
    const profile = await userService.getUserProfile(targetUserId, currentUserId);

    if (!profile) {
      return res.status(404).json({ 
        success: false, 
        message: 'User profile not found.' 
      });
    }

    return res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    let targetUserId = req.params.id;

    // Handle '/profile' or '/me' aliases dynamically
    if (!targetUserId || targetUserId === 'profile' || targetUserId === 'me') {
      targetUserId = req.user?.id;
    }

    const currentUserId = req.user?.id;

    if (!targetUserId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.',
      });
    }

    // Security Check: Users can only update their own profile unless they are an admin
    if (String(targetUserId) !== String(currentUserId) && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to update this profile.',
      });
    }

    // Merge request body with uploaded file paths
    const updatePayload = { ...req.body };

    // 1. Single File Upload Handler
    if (req.file) {
      const fileUrl = `/uploads/${req.file.filename}`;
      const field = req.file.fieldname;

      // Map document upload fields vs avatar upload fields
      if (['aadhaar_doc', 'aadhaar_doc_url', 'document', 'kyc_doc'].includes(field)) {
        updatePayload.aadhaar_doc_url = fileUrl;
      } else {
        updatePayload.avatar_url = fileUrl;
      }
    }

    // 2. Multiple Named Fields Handler (if upload.fields() is used)
    if (req.files) {
      if (req.files.avatar && req.files.avatar[0]) {
        updatePayload.avatar_url = `/uploads/${req.files.avatar[0].filename}`;
      }
      if (
        (req.files.aadhaar_doc && req.files.aadhaar_doc[0]) ||
        (req.files.document && req.files.document[0])
      ) {
        const docFile = req.files.aadhaar_doc ? req.files.aadhaar_doc[0] : req.files.document[0];
        updatePayload.aadhaar_doc_url = `/uploads/${docFile.filename}`;
      }
    }

    const updatedProfile = await userService.updateUserProfile(targetUserId, updatePayload);

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: updatedProfile,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        success: false, 
        message: error.message 
      });
    }
    next(error);
  }
};

const toggleConnection = async (req, res, next) => {
  try {
    const followerId = req.user?.id; 
    const followedId = req.params.id; 

    if (!followerId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Please log in to connect with users.',
      });
    }

    const result = await userService.toggleConnection(followerId, followedId);

    return res.status(200).json({
      success: true,
      message: `Successfully ${result.status} the user.`,
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        success: false, 
        message: error.message 
      });
    }
    next(error);
  }
};

const getUserActivities = async (req, res, next) => {
  try {
    let userId = req.params.id;

    // Handle '/profile' or '/me' aliases dynamically
    if (!userId || userId === 'profile' || userId === 'me') {
      userId = req.user?.id;
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required to fetch activities.',
      });
    }

    const activities = await userService.getActivities(userId);

    return res.status(200).json({
      success: true,
      data: activities,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ 
        success: false, 
        message: error.message 
      });
    }
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  toggleConnection,
  getUserActivities,
};