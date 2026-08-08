const express = require('express');
const router = express.Router();
const { 
  getMessages, 
  markMessagesAsRead, // 👈 Added
  getUnreadCount, 
  createMessage, 
  getConversations 
} = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// GET /api/v1/messages/unread-count -> Get unread message count for the current user
router.get('/unread-count', getUnreadCount);

// GET /api/v1/messages/conversations -> Get list of contacted users (MUST BE BEFORE :userId)
router.get('/conversations', getConversations);

// PUT /api/v1/messages/read/:userId -> Mark messages from specific user as read
router.put('/read/:userId', markMessagesAsRead); // 👈 Added route

// GET /api/v1/messages/:userId -> Get conversation history with specific user
router.get('/:userId', getMessages);

// POST /api/v1/messages -> Fallback API to store a message
router.post('/', createMessage);

module.exports = router;