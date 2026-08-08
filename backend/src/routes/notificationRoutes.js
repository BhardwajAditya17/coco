const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markChatNotificationsAsRead, // 👈 Added
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');

const { protect } = require('../middlewares/authMiddleware');

// Protect all notification routes
router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);

// PUT /api/v1/notifications/read/chat/:senderId -> Mark chat notifications from user as read
router.put('/read/chat/:senderId', markChatNotificationsAsRead); // 👈 Added route

router.patch('/:id/read', markAsRead);
router.put('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;