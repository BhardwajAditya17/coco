const express = require('express');
const {
  createPost,
  getFeed,
  deletePost,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  getLikes,
} = require('../controllers/postController');
const { protect, requireKyc } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/localUploadMiddleware');

const router = express.Router();

// Require both authentication AND verified KYC for all post/feed endpoints
router.use(protect, requireKyc);

// Feed & Post Creation
router.get('/', getFeed);
router.post('/', upload.array('media', 5), createPost);

// Post Deletion (Author or Admin)
router.delete('/:postId', deletePost);

// Likes Routes
router.get('/:postId/likes', getLikes);
router.post('/:postId/like', toggleLike);

// Comments Routes
router.get('/:postId/comments', getComments);
router.post('/:postId/comments', addComment);
router.delete('/comments/:commentId', deleteComment);

module.exports = router;