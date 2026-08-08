// postService
const prisma = require('../config/prisma');
const { createNotification } = require('./notificationService');

/**
 * Creates a new post in the database with normalized tags
 */
const createPost = async (userId, content, mediaUrls = [], tagsArray = []) => {
  const tagConnects = [];
  if (tagsArray && Array.isArray(tagsArray)) {
    for (const tagName of tagsArray) {
      if (!tagName) continue;
      
      // Strip leading '#' and normalize to lowercase
      const formattedTag = tagName.replace(/^#/, '').trim().toLowerCase();
      if (!formattedTag) continue;

      const tag = await prisma.tag.upsert({
        where: { name: formattedTag },
        update: {},
        create: { name: formattedTag },
      });

      tagConnects.push({
        tag: { connect: { id: tag.id } },
      });
    }
  }

  const formattedMediaUrls = Array.isArray(mediaUrls)
    ? mediaUrls
    : mediaUrls
    ? [mediaUrls]
    : [];

  return await prisma.post.create({
    data: {
      user_id: Number(userId),
      content: content || '',
      media_urls: formattedMediaUrls,
      tags: {
        create: tagConnects,
      },
    },
    include: {
      user: { select: { id: true, name: true, role: true, aadhaar_status: true } },
      tags: { include: { tag: true } },
      likes: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      comments: {
        orderBy: { created_at: 'asc' },
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });
};

/**
 * Fetches feed posts with user details, tags, likes, and comments included.
 * Supports case-insensitive tag filtering and handles legacy '#' formatted tags.
 */
const getFeed = async (page = 1, limit = 20, filterTag = null) => {
  const skip = (page - 1) * limit;

  // Clean tag input (strip '#' and trim)
  const cleanTag = filterTag ? filterTag.replace(/^#/, '').trim() : null;

  // Case-insensitive match supporting clean tag, '#' prefix, and partial matches
  const whereClause =
    cleanTag && cleanTag.toLowerCase() !== 'all'
      ? {
          tags: {
            some: {
              tag: {
                OR: [
                  { name: { equals: cleanTag, mode: 'insensitive' } },
                  { name: { equals: `#${cleanTag}`, mode: 'insensitive' } },
                  { name: { contains: cleanTag, mode: 'insensitive' } },
                ],
              },
            },
          },
        }
      : {};

  const posts = await prisma.post.findMany({
    where: whereClause,
    skip: Number(skip),
    take: Number(limit),
    orderBy: { created_at: 'desc' },
    include: {
      user: { select: { id: true, name: true, role: true, avatar_url: true, aadhaar_status: true } },
      tags: { include: { tag: true } },
      likes: {
        include: {
          user: { select: { id: true, name: true, role: true, avatar_url: true } },
        },
      },
      comments: {
        orderBy: { created_at: 'asc' },
        include: {
          user: { select: { id: true, name: true, role: true, avatar_url: true } },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const total = await prisma.post.count({ where: whereClause });

  return { posts, total };
};

/**
 * Deletes a post with authorization check (author OR admin)
 */
const deletePost = async (postId, requestingUserId, requestingUserRole) => {
  const numericPostId = Number(postId);

  const post = await prisma.post.findUnique({
    where: { id: numericPostId },
    select: { user_id: true },
  });

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const numericUserId = Number(requestingUserId);
  const isPostAuthor = post.user_id === numericUserId;
  const isAdmin = requestingUserRole?.toLowerCase() === 'admin';

  if (!isPostAuthor && !isAdmin) {
    const error = new Error('Not authorized to delete this post');
    error.statusCode = 403;
    throw error;
  }

  return await prisma.post.delete({
    where: { id: numericPostId },
  });
};

/**
 * Toggles like status for a given post and user.
 */
const toggleLike = async (userId, postId) => {
  const numericPostId = Number(postId);
  const numericUserId = Number(userId);

  const post = await prisma.post.findUnique({
    where: { id: numericPostId },
    select: { user_id: true },
  });

  if (!post) {
    const error = new Error('Post not found');
    error.statusCode = 404;
    throw error;
  }

  const existingLike = await prisma.like.findUnique({
    where: {
      post_id_user_id: {
        post_id: numericPostId,
        user_id: numericUserId,
      },
    },
  });

  if (existingLike) {
    await prisma.like.delete({
      where: {
        post_id_user_id: {
          post_id: numericPostId,
          user_id: numericUserId,
        },
      },
    });
    return { status: 'unliked', postOwnerId: post.user_id };
  } else {
    await prisma.like.create({
      data: {
        post_id: numericPostId,
        user_id: numericUserId,
      },
    });

    // 🔔 TRIGGER NOTIFICATION
    try {
      await createNotification({
        recipientId: post.user_id,
        actorId: numericUserId,
        type: 'like',
        targetId: String(numericPostId),
        message: 'liked your post',
      });
    } catch (err) {
      console.warn('[Post Service] Failed to trigger like notification:', err.message);
    }

    return { status: 'liked', postOwnerId: post.user_id };
  }
};

/**
 * Adds a comment to a specific post.
 */
const addComment = async (userId, postId, content) => {
  const comment = await prisma.comment.create({
    data: {
      user_id: Number(userId),
      post_id: Number(postId),
      content,
    },
    include: {
      user: { select: { id: true, name: true, role: true, avatar_url: true } },
      post: { select: { user_id: true } },
    },
  });

  // 🔔 TRIGGER NOTIFICATION
  try {
    if (comment.post?.user_id) {
      await createNotification({
        recipientId: comment.post.user_id,
        actorId: Number(userId),
        type: 'comment',
        targetId: String(postId),
        message: content.length > 30 ? `${content.substring(0, 30)}...` : content,
      });
    }
  } catch (err) {
    console.warn('[Post Service] Failed to trigger comment notification:', err.message);
  }

  return comment;
};

/**
 * Get all comments for a specific post
 */
const getComments = async (postId) => {
  return await prisma.comment.findMany({
    where: { post_id: Number(postId) },
    orderBy: { created_at: 'asc' },
    include: {
      user: { select: { id: true, name: true, role: true, avatar_url: true } },
    },
  });
};

/**
 * Deletes a comment by ID with ownership check (commenter OR post author OR admin)
 */
const deleteComment = async (commentId, requestingUserId, requestingUserRole) => {
  const numericCommentId = Number(commentId);

  if (requestingUserId) {
    const comment = await prisma.comment.findUnique({
      where: { id: numericCommentId },
      select: {
        user_id: true,
        post: {
          select: { user_id: true },
        },
      },
    });

    if (!comment) {
      const error = new Error('Comment not found');
      error.statusCode = 404;
      throw error;
    }

    const numericUserId = Number(requestingUserId);
    const isCommentAuthor = comment.user_id === numericUserId;
    const isPostAuthor = comment.post?.user_id === numericUserId;
    const isAdmin = requestingUserRole?.toLowerCase() === 'admin';

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      const error = new Error('Not authorized to delete this comment');
      error.statusCode = 403;
      throw error;
    }
  }

  return await prisma.comment.delete({
    where: { id: numericCommentId },
  });
};

/**
 * Get all users who liked a specific post
 */
const getLikes = async (postId) => {
  return await prisma.like.findMany({
    where: { post_id: Number(postId) },
    include: {
      user: { select: { id: true, name: true, role: true, avatar_url: true } },
    },
  });
};

module.exports = {
  createPost,
  getFeed,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  getLikes,
};