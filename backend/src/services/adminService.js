const prisma = require('../config/prisma');
const { ROLES, AADHAAR_STATUS } = require('../utils/constants');

const getPlatformAnalytics = async () => {
  const [totalUsers, totalNGOs, totalPosts, pendingKYC] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: ROLES.NGO } }),
    prisma.post.count(),
    prisma.user.count({ where: { aadhaar_status: AADHAAR_STATUS.PENDING } }),
  ]);

  return { totalUsers, totalNGOs, totalPosts, pendingKYC };
};

const getPendingMembers = async () => {
  return await prisma.user.findMany({
    where: { aadhaar_status: AADHAAR_STATUS.PENDING },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });
};

const updateMemberKYCStatus = async (userId, status) => {
  if (!Object.values(AADHAAR_STATUS).includes(status)) {
    throw new Error('Invalid status provided.');
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { aadhaar_status: status },
    select: { id: true, name: true, aadhaar_status: true },
  });
};

const deletePostById = async (postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error('Post not found.');
  }

  // Prisma Cascade delete will automatically clean up Comments, Likes, and PostTags
  await prisma.post.delete({ where: { id: postId } });
  return true;
};

module.exports = {
  getPlatformAnalytics,
  getPendingMembers,
  updateMemberKYCStatus,
  deletePostById,
};