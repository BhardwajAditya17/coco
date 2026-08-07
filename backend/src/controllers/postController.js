const postService = require('../services/postService');

const createPost = async (req, res, next) => {
  try {
    const { content, tags } = req.body;
    const userId = req.user.id;
    
    // Collect all uploaded media paths
    let mediaUrls = [];
    if (req.files && req.files.length > 0) {
      mediaUrls = req.files.map((file) => {
        if (file.filename) {
          return `/uploads/${file.filename}`;
        }
        return file.path; // Cloudinary fallback
      });
    } else if (req.file) {
      // Single file fallback
      mediaUrls.push(req.file.filename ? `/uploads/${req.file.filename}` : req.file.path);
    }
    
    // Safely parse tags stringified from FormData
    let parsedTags = [];
    if (tags) {
      parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    if (!content && mediaUrls.length === 0) {
      return res.status(400).json({ success: false, message: 'Post must contain text or at least one image.' });
    }

    const newPost = await postService.createPost(userId, content, mediaUrls, parsedTags);

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: newPost,
    });
  } catch (error) {
    next(error);
  }
};

const getFeed = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filterTag = req.query.tag || null;

    const { posts, total } = await postService.getFeed(page, limit, filterTag);

    res.status(200).json({
      success: true,
      data: posts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId || req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    await postService.deletePost(postId, userId, userRole);

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const result = await postService.toggleLike(userId, postId);

    res.status(200).json({
      success: true,
      message: `Post ${result.status} successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment content cannot be empty.' });
    }

    const comment = await postService.addComment(userId, postId, content);

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

const getComments = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const comments = await postService.getComments(postId);
    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  try {
    const commentId = req.params.commentId || req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    await postService.deleteComment(commentId, userId, userRole);

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getLikes = async (req, res, next) => {
  try {
    const { postId } = req.params;
    const likes = await postService.getLikes(postId);
    res.status(200).json({
      success: true,
      data: likes,
    });
  } catch (error) {
    next(error);
  }
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