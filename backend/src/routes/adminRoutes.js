const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { adminMiddleware } = require('../middlewares/adminMiddleware');

// Protect all admin endpoints with authentication and strict role validation
router.use(protect);
router.use(adminMiddleware);

// KPI Overview
router.get('/stats', adminController.getStats);

// User Management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.patch('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// Moderation
router.get('/moderation/posts', adminController.getFlaggedPosts);
router.delete('/moderation/posts/:id', adminController.deletePost);
router.patch('/moderation/posts/:id/dismiss', adminController.dismissPostFlags);

// Audit Trail Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;