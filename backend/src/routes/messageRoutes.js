const express = require('express');
const router = express.Router();
const { getMessages, createMessage, getConversations } = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// GET /api/v1/messages/conversations -> Get list of contacted users (MUST BE FIRST)
router.get('/conversations', getConversations);

// GET /api/v1/messages/:userId -> Get conversation history with specific user
router.get('/:userId', getMessages);

// POST /api/v1/messages -> Fallback API to store a message
router.post('/', createMessage);

module.exports = router;