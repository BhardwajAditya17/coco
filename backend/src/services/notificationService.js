const prisma = require('../config/prisma');
const axios = require('axios');

/**
 * Creates a notification in DB and triggers Go WebSocket push
 */
const createNotification = async (payload) => {
  console.log('\n================ 🔔 NOTIFICATION PROCESS START ================');
  console.log('📦 [1. Raw Payload Received]:', JSON.stringify(payload, null, 2));

  // 1. Support both standard and chat parameter naming conventions
  const rawRecipientId = payload.recipientId ?? payload.receiverId ?? payload.recipient_id ?? payload.receiver_id;
  const rawActorId = payload.actorId ?? payload.senderId ?? payload.actor_id ?? payload.sender_id;
  const rawMessage = payload.message ?? payload.content ?? '';

  const recipientId = Number(rawRecipientId);
  const actorId = Number(rawActorId);

  console.log('🔍 [2. Extracted IDs]:', {
    rawRecipientId,
    parsedRecipientId: recipientId,
    rawActorId,
    parsedActorId: actorId,
    rawMessage,
  });

  // 2. Validate IDs to prevent Prisma Int insert errors with NaN
  if (isNaN(recipientId) || isNaN(actorId)) {
    console.error('❌ [3. REJECTED - Invalid IDs]: recipientId or actorId is NaN!');
    console.log('================ 🔔 NOTIFICATION PROCESS END ================ \n');
    return null;
  }

  // 3. Prevent self-notifications
  if (recipientId === actorId) {
    console.warn(`⚠️ [3. SKIPPED - Self-Notification Guard]: User ${actorId} sent an action to themselves. No notification created.`);
    console.log('================ 🔔 NOTIFICATION PROCESS END ================ \n');
    return null;
  }

  // 4. Handle targetId safely (avoid string "undefined" or "null")
  const targetId = (payload.targetId !== undefined && payload.targetId !== null) 
    ? String(payload.targetId) 
    : null;

  try {
    console.log(`💽 [4. Attempting Prisma DB Insert]: Saving to 'notification' table...`);
    
    // 5. Insert into PostgreSQL DB via Prisma
    const notification = await prisma.notification.create({
      data: {
        recipient_id: recipientId,
        actor_id: actorId,
        type: payload.type || 'chat',
        target_id: targetId,
        message: String(rawMessage),
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatar_url: true,
          },
        },
      },
    });

    console.log('✅ [5. DB Insert Successful!]: Saved Notification ID:', notification.id);

    // 6. Format response payload
    const notificationData = {
      id: notification.id,
      recipient_id: String(notification.recipient_id),
      actor_id: notification.actor_id,
      actor_name: notification.actor?.name || 'Someone',
      actor_avatar: notification.actor?.avatar_url || null,
      type: notification.type,
      target_id: notification.target_id,
      message: notification.message,
      is_read: notification.is_read,
      created_at: notification.created_at,
    };

    // 7. Trigger Go WebSocket Push
    const wsPayload = {
      type: 'notification',
      recipient_id: String(notification.recipient_id),
      receiverId: String(notification.recipient_id),
      actor_id: notification.actor_id,
      actor_name: notificationData.actor_name,
      actor_avatar: notificationData.actor_avatar,
      notification_type: notification.type,
      target_id: notification.target_id,
      message: notification.message,
      is_read: notification.is_read,
      created_at: notification.created_at,
      data: notificationData,
    };

    const GO_WS_URL = process.env.GO_SERVICE_URL || process.env.GO_WS_URL || 'http://localhost:8080';
    const INTERNAL_SECRET = process.env.INTERNAL_SERVICE_SECRET || '';

    console.log(`🚀 [6. Triggering Go WS Push]: POST ${GO_WS_URL}/internal/notify ...`);

    axios.post(`${GO_WS_URL}/internal/notify`, wsPayload, {
      timeout: 1500,
      headers: {
        'X-Internal-Secret': INTERNAL_SECRET,
      },
    })
    .then((res) => {
      console.log('⚡ [7. Go Service Response]: WS push accepted with status:', res.status);
    })
    .catch((err) => {
      console.warn('⚠️ [7. Go WS Push Warning]: Unable to reach Go service:', err.message);
    });

    console.log('================ 🔔 NOTIFICATION PROCESS COMPLETE ================ \n');
    return notificationData;

  } catch (error) {
    console.error('❌ [CRITICAL DB ERROR]: Prisma failed to create notification!');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('Full Stack Trace:', error);
    console.log('================ 🔔 NOTIFICATION PROCESS END ================ \n');
    return null;
  }
};

module.exports = {
  createNotification,
};