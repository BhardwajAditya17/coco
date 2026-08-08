const messageService = require('../services/messageService');

const getMessages = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { userId: otherUserId } = req.params;

    if (!otherUserId) {
      return res.status(400).json({ success: false, message: 'Recipient ID is required.' });
    }

    const messages = await messageService.getChatHistory(currentUserId, otherUserId);

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

const markMessagesAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { userId: senderId } = req.params;

    if (!senderId) {
      return res.status(400).json({ success: false, message: 'Sender ID is required.' });
    }

    await messageService.markAsRead(currentUserId, senderId);

    return res.status(200).json({
      success: true,
      message: 'Messages and notifications marked as read.',
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const count = await messageService.getUnreadChatCount(currentUserId);

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
};

const createMessage = async (req, res, next) => {
  try {
    const senderId = req.user.id;
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'Receiver ID and content are required.' });
    }

    const newMessage = await messageService.saveMessage(senderId, receiverId, content);

    return res.status(201).json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    next(error);
  }
};

const getConversations = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const conversations = await messageService.getConversations(currentUserId);

    return res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMessages,
  markMessagesAsRead,
  getUnreadCount,
  createMessage,
  getConversations,
};