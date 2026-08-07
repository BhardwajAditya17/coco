import api from './api';

const postService = {
  /**
   * Fetch all posts, optionally filtered by a specific tag
   */
  getPosts: async (tag = 'All') => {
    const params = tag !== 'All' ? { tag } : {};
    const response = await api.get('/posts', { params });
    return response.data;
  },

  /**
   * Create a new post. Expects FormData because it might contain an image file.
   * Axios automatically sets the correct multipart/form-data boundary.
   */
  createPost: async (formData) => {
    const response = await api.post('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Add a comment to a specific post
   */
  addComment: async (postId, content) => {
    const response = await api.post(`/posts/${postId}/comments`, { content });
    return response.data;
  },

  /**
   * Toggle a like on a post
   */
  toggleLike: async (postId) => {
    const response = await api.post(`/posts/${postId}/like`);
    return response.data;
  }
};

export default postService;