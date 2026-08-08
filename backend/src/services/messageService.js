const prisma = require('../config/prisma');
const { createNotification } = require('./notificationService');

/**
 * Mark messages and associated notifications from a specific contact as read
 */
const markAsRead = async (userId, otherUserId) => {
  const currentId = parseInt(userId, 10);
  const targetId = parseInt(otherUserId, 10);

  if (isNaN(currentId) || isNaN(targetId)) return;

  // 1. Mark messages as read
  await prisma.message.updateMany({
    where: {
      sender_id: targetId,
      receiver_id: currentId,
      is_read: false,
    },
    data: { is_read: true },
  });

  // 2. Mark corresponding chat notifications as read
  await prisma.notification.updateMany({
    where: {
      recipient_id: currentId,
      actor_id: targetId,
      type: 'chat',
      is_read: false,
    },
    data: { is_read: true },
  });
};

/**
 * Fetch chat history between two users and mark incoming messages/notifications as read
 */
const getChatHistory = async (userId, otherUserId) => {
  const currentId = parseInt(userId, 10);
  const targetId = parseInt(otherUserId, 10);

  // Automatically mark incoming messages and notifications from target user as read
  await markAsRead(currentId, targetId);

  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { sender_id: currentId, receiver_id: targetId },
        { sender_id: targetId, receiver_id: currentId },
      ],
    },
    orderBy: {
      created_at: 'asc',
    },
    take: 100,
  });

  return messages.map((m) => ({
    id: m.id,
    senderId: m.sender_id,
    receiverId: m.receiver_id,
    content: m.content,
    createdAt: m.created_at,
    is_read: m.is_read,
  }));
};

/**
 * Count total unread chat messages for current user across all conversations
 */
const getUnreadChatCount = async (userId) => {
  const currentId = parseInt(userId, 10);
  return await prisma.message.count({
    where: {
      receiver_id: currentId,
      is_read: false,
    },
  });
};

/**
 * Save a message directly via REST + push real-time notification trigger
 */
const saveMessage = async (senderId, receiverId, content) => {
  const sId = parseInt(senderId, 10);
  const rId = parseInt(receiverId, 10);

  const newMessage = await prisma.message.create({
    data: {
      sender_id: sId,
      receiver_id: rId,
      content,
    },
  });

  try {
    await createNotification({
      recipientId: rId,
      actorId: sId,
      type: 'chat',
      targetId: String(sId),
      message: content.length > 30 ? `${content.substring(0, 30)}...` : content,
    });
  } catch (err) {
    console.warn('[Message Service] Failed to trigger live chat notification:', err.message);
  }

  return {
    id: newMessage.id,
    senderId: newMessage.sender_id,
    receiverId: newMessage.receiver_id,
    content: newMessage.content,
    createdAt: newMessage.created_at,
  };
};

/**
 * Fetch list of users with active conversation history including unread Counts
 */
const getConversations = async (userId) => {
  const currentId = parseInt(userId, 10);

  // 1. Fetch recent messages involving the user
  const recentMessages = await prisma.message.findMany({
    where: {
      OR: [{ sender_id: currentId }, { receiver_id: currentId }],
    },
    orderBy: {
      created_at: 'desc',
    },
    take: 500,
  });

  const conversationsMap = new Map();
  for (const msg of recentMessages) {
    const contactId = msg.sender_id === currentId ? msg.receiver_id : msg.sender_id;

    if (!conversationsMap.has(contactId)) {
      conversationsMap.set(contactId, {
        lastMessage: msg.content,
        lastMessageTime: msg.created_at,
      });
    }
  }

  const contactIds = Array.from(conversationsMap.keys());
  if (contactIds.length === 0) return [];

  // 2. Aggregate unread count grouped by sender (contact)
  const unreadCounts = await prisma.message.groupBy({
    by: ['sender_id'],
    where: {
      receiver_id: currentId,
      sender_id: { in: contactIds },
      is_read: false,
    },
    _count: {
      id: true,
    },
  });

  const unreadMap = new Map(
    unreadCounts.map((u) => [u.sender_id, u._count.id])
  );

  // 3. Get user details for each contact
  const users = await prisma.user.findMany({
    where: {
      id: { in: contactIds },
    },
    select: {
      id: true,
      name: true,
      avatar_url: true,
      role: true,
      current_position: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  // 4. Assemble output array with populated unread counts
  const result = [];
  for (const [contactId, msgData] of conversationsMap.entries()) {
    const userInfo = userMap.get(contactId);
    if (userInfo) {
      result.push({
        id: userInfo.id,
        name: userInfo.name,
        avatar_url: userInfo.avatar_url,
        role: userInfo.role,
        current_position: userInfo.current_position,
        lastMessage: msgData.lastMessage,
        lastMessageTime: msgData.lastMessageTime,
        unreadCount: unreadMap.get(contactId) || 0,
      });
    }
  }

  return result;
};

module.exports = {
  markAsRead,
  getChatHistory,
  getUnreadChatCount,
  saveMessage,
  getConversations,
};