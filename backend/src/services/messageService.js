const prisma = require('../config/prisma');

/**
 * Fetch chat history between two users
 */
const getChatHistory = async (userId, otherUserId) => {
  const currentId = parseInt(userId, 10);
  const targetId = parseInt(otherUserId, 10);

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
  });

  return messages;
};

/**
 * Save a message directly via REST (fallback if Go doesn't save to DB)
 */
const saveMessage = async (senderId, receiverId, content) => {
  return await prisma.message.create({
    data: {
      sender_id: parseInt(senderId, 10),
      receiver_id: parseInt(receiverId, 10),
      content,
    },
  });
};

/**
 * Fetch list of users with active conversation history + latest message details
 */
const getConversations = async (userId) => {
  const currentId = parseInt(userId, 10);

  // 1. Get all messages where current user is sender or receiver (newest first)
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { sender_id: currentId },
        { receiver_id: currentId },
      ],
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  // 2. Filter out duplicate contacts, preserving only the latest message for each contact
  const conversationsMap = new Map();
  for (const msg of messages) {
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

  // 3. Fetch user details for the contacted users
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

  // 4. Combine user profiles with last message info in sorted order
  const userMap = new Map(users.map((u) => [u.id, u]));

  const result = [];
  for (const [contactId, msgData] of conversationsMap.entries()) {
    const userInfo = userMap.get(contactId);
    if (userInfo) {
      result.push({
        ...userInfo,
        lastMessage: msgData.lastMessage,
        lastMessageTime: msgData.lastMessageTime,
      });
    }
  }

  return result;
};

module.exports = {
  getChatHistory,
  saveMessage,
  getConversations, // 👈 Exported new service
};