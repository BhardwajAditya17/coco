const prisma = require('../config/prisma');

const getUserProfile = async (targetUserId, currentUserId = null) => {
  const targetId = isNaN(targetUserId) ? targetUserId : parseInt(targetUserId, 10);
  const currId = currentUserId ? (isNaN(currentUserId) ? currentUserId : parseInt(currentUserId, 10)) : null;

  const profile = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      bio: true,
      location: true,
      aadhaar_status: true,
      aadhaar_doc_url: true,
      avatar_url: true,
      current_position: true,
      fee_status: true,
      user_type: true,
      approval_status: true,
      created_at: true,
      _count: {
        select: { followers: true, following: true, posts: true },
      },
      ...(currId && {
        followers: {
          where: { follower_id: currId },
          select: { follower_id: true },
        },
      }),
    },
  });

  if (!profile) return null;

  const isFollowing = currId 
    ? profile.followers.length > 0 
    : false;
  
  delete profile.followers;

  return {
    ...profile,
    isFollowing,
  };
};

const updateUserProfile = async (targetUserId, updateData) => {
  const targetId = isNaN(targetUserId) ? targetUserId : parseInt(targetUserId, 10);

  // Extract allowed profile & verification fields
  const { 
    name, 
    bio, 
    location, 
    current_position, 
    currentPosition, 
    avatar_url, 
    avatarUrl,
    aadhaar_doc_url,
    aadhaarDocUrl,
    aadhaar_number,
    aadhaarNumber
  } = updateData;

  const dataToUpdate = {};
  if (name !== undefined) dataToUpdate.name = name;
  if (bio !== undefined) dataToUpdate.bio = bio;
  if (location !== undefined) dataToUpdate.location = location;

  // Support both snake_case and camelCase field naming
  if (current_position !== undefined) dataToUpdate.current_position = current_position;
  if (currentPosition !== undefined) dataToUpdate.current_position = currentPosition;

  const avatar = avatar_url !== undefined ? avatar_url : avatarUrl;
  if (avatar !== undefined) dataToUpdate.avatar_url = avatar;

  // Handle Identity Verification Document updates
  const docUrl = aadhaar_doc_url !== undefined ? aadhaar_doc_url : aadhaarDocUrl;
  if (docUrl !== undefined) {
    dataToUpdate.aadhaar_doc_url = docUrl;
    dataToUpdate.aadhaar_status = 'pending'; // Reset verification status upon new document upload
  }

  const idNum = aadhaar_number !== undefined ? aadhaar_number : aadhaarNumber;
  if (idNum !== undefined) {
    dataToUpdate.aadhaar_number = idNum;
  }

  try {
    const updatedProfile = await prisma.user.update({
      where: { id: targetId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        bio: true,
        location: true,
        aadhaar_status: true,
        aadhaar_doc_url: true,
        avatar_url: true,
        current_position: true,
        fee_status: true,
        user_type: true,
        approval_status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return updatedProfile;
  } catch (error) {
    // Prisma Record Not Found code
    if (error.code === 'P2025') {
      const notFoundError = new Error('User profile not found.');
      notFoundError.statusCode = 404;
      throw notFoundError;
    }
    throw error;
  }
};

const toggleConnection = async (followerId, followedId) => {
  const fId = isNaN(followerId) ? followerId : parseInt(followerId, 10);
  const tId = isNaN(followedId) ? followedId : parseInt(followedId, 10);

  if (fId === tId) {
    const error = new Error('You cannot follow yourself.');
    error.statusCode = 400;
    throw error;
  }

  const targetUser = await prisma.user.findUnique({ 
    where: { id: tId },
    select: { id: true } 
  });
  
  if (!targetUser) {
    const error = new Error('Target user not found.');
    error.statusCode = 404;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    const existingConnection = await tx.connection.findUnique({
      where: {
        follower_id_followed_id: {
          follower_id: fId,
          followed_id: tId,
        },
      },
    });

    if (existingConnection) {
      await tx.connection.delete({
        where: {
          follower_id_followed_id: {
            follower_id: fId,
            followed_id: tId,
          },
        },
      });
      return { status: 'unfollowed' };
    } else {
      await tx.connection.create({
        data: {
          follower_id: fId,
          followed_id: tId,
        },
      });
      return { status: 'followed' };
    }
  });
};

const getActivities = async (userId) => {
  const parsedId = isNaN(userId) ? userId : parseInt(userId, 10);

  const [posts, likes, comments] = await Promise.all([
    prisma.post.findMany({
      where: { user_id: parsedId },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
    prisma.like.findMany({
      where: { user_id: parsedId },
      include: {
        post: { select: { id: true, content: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
    prisma.comment.findMany({
      where: { user_id: parsedId },
      orderBy: { created_at: 'desc' },
      take: 10,
    }),
  ]);

  const postActivities = posts.map(post => ({
    id: `post-${post.id}`,
    type: 'post',
    content: post.content,
    createdAt: post.created_at,
    targetId: post.id,
  }));

  const likeActivities = likes.map(like => ({
    id: like.id ? `like-${like.id}` : `like-${like.user_id}-${like.post_id || like.postId}`,
    type: 'like',
    content: like.post ? like.post.content : 'Liked a post',
    createdAt: like.created_at,
    targetId: like.post_id || like.postId,
  }));

  const commentActivities = comments.map(comment => ({
    id: `comment-${comment.id}`,
    type: 'comment',
    content: comment.content,
    createdAt: comment.created_at,
    targetId: comment.post_id || comment.postId,
  }));

  return [...postActivities, ...likeActivities, ...commentActivities]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 15);
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  toggleConnection,
  getActivities,
};