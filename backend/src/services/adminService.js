const prisma = require('../config/prisma');

/**
 * Helper to record system audit log entries.
 * Gracefully no-ops if AuditLog model does not exist in schema.
 */
const createAuditLog = async (adminId, action, targetType, targetId, details = null) => {
  try {
    if (prisma.auditLog) {
      await prisma.auditLog.create({
        data: {
          adminId: Number(adminId),
          action,
          targetType,
          targetId: String(targetId),
          details: details ? JSON.stringify(details) : null,
        },
      });
    }
  } catch (error) {
    console.error('[Audit Log Failure]:', error.message);
  }
};

/**
 * Fetch high-level KPI dashboard statistics.
 * Uses existing `approval_status` to determine banned users.
 */
const getSystemStats = async () => {
  const [totalUsers, bannedUsers, totalPosts, flaggedPosts] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { approval_status: 'banned' } }),
    prisma.post.count(),
    // Fallback if is_flagged is added to Post schema, otherwise counts 0
    prisma.post.count({ where: { is_flagged: true } }).catch(() => 0),
  ]);

  return {
    totalUsers,
    activeUsers: totalUsers - bannedUsers,
    bannedUsers,
    totalPosts,
    flaggedPosts,
  };
};

/**
 * Fetch paginated users with search & filters using existing schema fields.
 */
const getUsers = async ({ page = 1, limit = 10, search = '', role, status }) => {
  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status === 'banned') {
    where.approval_status = 'banned';
  } else if (status === 'active') {
    where.approval_status = { not: 'banned' };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: Number(limit),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        approval_status: true,
        fee_status: true,
        aadhaar_status: true,
        created_at: true,
        updated_at: true,
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  // Format response so frontend gets a normalized isBanned boolean
  const formattedUsers = users.map((user) => ({
    ...user,
    isBanned: user.approval_status === 'banned',
  }));

  return {
    users: formattedUsers,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

/**
 * Ban or Unban a user using `approval_status`.
 */
const updateUserStatus = async (adminId, targetUserId, isBanned, reason) => {
  const updatedUser = await prisma.user.update({
    where: { id: Number(targetUserId) },
    data: { approval_status: isBanned ? 'banned' : 'approved' },
    select: { id: true, name: true, email: true, approval_status: true, role: true },
  });

  await createAuditLog(
    adminId,
    isBanned ? 'BAN_USER' : 'UNBAN_USER',
    'USER',
    targetUserId,
    { reason }
  );

  return {
    ...updatedUser,
    isBanned: updatedUser.approval_status === 'banned',
  };
};

/**
 * Update user role (USER, MODERATOR, ADMIN).
 */
const updateUserRole = async (adminId, targetUserId, role) => {
  const updatedUser = await prisma.user.update({
    where: { id: Number(targetUserId) },
    data: { role },
    select: { id: true, name: true, email: true, role: true },
  });

  await createAuditLog(adminId, 'CHANGE_ROLE', 'USER', targetUserId, { newRole: role });

  return updatedUser;
};

/**
 * Permanently delete a user account.
 */
const deleteUser = async (adminId, targetUserId) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: Number(targetUserId) },
    select: { id: true, email: true, name: true },
  });

  if (!targetUser) {
    throw new Error('User not found');
  }

  await prisma.user.delete({
    where: { id: Number(targetUserId) },
  });

  await createAuditLog(adminId, 'DELETE_USER', 'USER', targetUserId, {
    email: targetUser.email,
  });

  return { id: targetUserId, email: targetUser.email };
};

/**
 * Fetch flagged or reported posts.
 * Uses `user` relation (instead of `author`).
 */
const getFlaggedPosts = async ({ page = 1, limit = 10 }) => {
  const skip = (Number(page) - 1) * Number(limit);
  
  // Safe check for is_flagged field
  const where = { is_flagged: true };

  try {
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      prisma.post.count({ where }),
    ]);

    // Map `user` relation to `author` for frontend compatibility
    const formattedPosts = posts.map((post) => ({
      ...post,
      author: post.user,
    }));

    return {
      posts: formattedPosts,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  } catch (error) {
    // Return empty set if is_flagged column isn't in Post table yet
    return {
      posts: [],
      pagination: { total: 0, page: Number(page), limit: Number(limit), totalPages: 0 },
    };
  }
};

/**
 * Delete a post in violation.
 * Uses `user_id` field.
 */
const deletePost = async (adminId, postId, reason) => {
  const post = await prisma.post.findUnique({
    where: { id: Number(postId) },
    select: { id: true, user_id: true },
  });

  if (!post) {
    throw new Error('Post not found');
  }

  await prisma.post.delete({
    where: { id: Number(postId) },
  });

  await createAuditLog(adminId, 'DELETE_POST', 'POST', postId, {
    authorId: post.user_id,
    reason,
  });

  return { id: postId };
};

/**
 * Dismiss flags on a post.
 */
const dismissPostFlags = async (adminId, postId) => {
  let updatedPost;
  try {
    updatedPost = await prisma.post.update({
      where: { id: Number(postId) },
      data: { is_flagged: false },
    });
  } catch (e) {
    updatedPost = { id: postId };
  }

  await createAuditLog(adminId, 'DISMISS_POST_FLAGS', 'POST', postId);

  return updatedPost;
};

/**
 * Fetch system audit logs.
 */
const getAuditLogs = async ({ page = 1, limit = 20 }) => {
  if (!prisma.auditLog) {
    return { auditLogs: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [auditLogs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: Number(limit),
      orderBy: { created_at: 'desc' },
    }),
    prisma.auditLog.count(),
  ]);

  return {
    auditLogs,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  };
};

module.exports = {
  getSystemStats,
  getUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getFlaggedPosts,
  deletePost,
  dismissPostFlags,
  getAuditLogs,
};