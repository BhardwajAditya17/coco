const prisma = require('../config/prisma');

// GET /api/notifications -> Get all notifications for logged-in user
const getNotifications = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized user' });
    }

    const notifications = await prisma.notification.findMany({
      where: { recipient_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
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

    const formatted = notifications.map((n) => ({
      id: n.id,
      recipient_id: String(n.recipient_id),
      actor_id: n.actor_id,
      actor_name: n.actor?.name || 'Someone',
      actor_avatar: n.actor?.avatar_url || null,
      type: n.type,
      target_id: n.target_id,
      message: n.message,
      is_read: n.is_read,
      created_at: n.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

// GET /api/notifications/unread-count -> For Navbar Badge
const getUnreadCount = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized user' });
    }

    const count = await prisma.notification.count({
      where: {
        recipient_id: userId,
        is_read: false,
      },
    });

    return res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching unread count' });
  }
};

// PATCH /api/notifications/:id/read -> Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const notificationId = Number(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipient_id: userId,
      },
      data: { is_read: true },
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or access denied' });
    }

    return res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking as read:', error);
    return res.status(500).json({ success: false, message: 'Server error marking notification as read' });
  }
};

// PUT /api/notifications/read-all -> Mark all as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized user' });
    }

    await prisma.notification.updateMany({
      where: {
        recipient_id: userId,
        is_read: false,
      },
      data: { is_read: true },
    });

    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    return res.status(500).json({ success: false, message: 'Server error marking all notifications as read' });
  }
};

// DELETE /api/notifications/:id -> Delete notification
const deleteNotification = async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const notificationId = Number(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const result = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        recipient_id: userId,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or access denied' });
    }

    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting notification' });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};