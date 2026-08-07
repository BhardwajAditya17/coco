import { useState, useCallback } from 'react';
import postService from '../services/postService';

export const usePosts = () => {
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async (tag = 'All') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await postService.getPosts(tag);
      setPosts(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPost = useCallback(async (formData) => {
    setError(null);
    try {
      const newPost = await postService.createPost(formData);
      // Update local state immediately so the new post appears at the top
      setPosts((prev) => [newPost, ...prev]);
      return newPost;
    } catch (err) {
      setError(err.message || 'Failed to create post');
      throw err;
    }
  }, []);

  const addComment = useCallback(async (postId, content) => {
    try {
      const newComment = await postService.addComment(postId, content);

      // Optimistically update the post's comment list in state
      setPosts((prevPosts) => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                comments: [...(post.comments || []), newComment], 
                _count: { ...post._count, comments: (post._count?.comments || 0) + 1 } 
              }
            : post
        )
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
      throw err;
    }
  }, []);

  return {
    posts,
    isLoading,
    error,
    fetchPosts,
    createPost,
    addComment
  };
};