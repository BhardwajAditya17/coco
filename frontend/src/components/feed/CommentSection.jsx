import React, { useState, useEffect, useRef } from 'react';
import { Send, X, MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Loader from '../common/Loader'; // Adjust path if needed

/**
 * Helper to convert relative server paths to absolute URLs
 */
const getImageUrl = (mediaInput) => {
  if (!mediaInput) return null;

  let mediaUrl = typeof mediaInput === 'object'
    ? (mediaInput.url || mediaInput.path || mediaInput.src || '')
    : mediaInput;

  if (typeof mediaUrl !== 'string' || !mediaUrl.trim()) return null;

  if (
    mediaUrl.startsWith('http://') ||
    mediaUrl.startsWith('https://') ||
    mediaUrl.startsWith('blob:') ||
    mediaUrl.startsWith('data:')
  ) {
    return mediaUrl;
  }

  let cleanPath = mediaUrl.replace(/\\/g, '/');
  if (!cleanPath.startsWith('/')) {
    cleanPath = `/${cleanPath}`;
  }

  const SERVER_BASE_URL = 'http://localhost:5002';
  return `${SERVER_BASE_URL}${cleanPath}`;
};

/**
 * Reusable User Avatar Component
 */
const UserAvatar = ({ user, className = "w-8 h-8 text-xs" }) => {
  const [hasError, setHasError] = useState(false);

  const rawUrl =
    user?.avatar_url ||
    user?.avatarUrl ||
    user?.avatar ||
    user?.profile_picture ||
    user?.profilePicture;

  const avatarUrl = getImageUrl(rawUrl);
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold shadow-xs overflow-hidden shrink-0 ${className}`}>
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={user?.name || 'User'}
          className="w-full h-full object-cover block"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

// Helper for human-readable relative dates
const timeAgo = (dateString) => {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const CommentSection = ({
  post,
  postId,
  comments: initialComments = [],
  onClose,
  onCommentAdded,
  onAddComment,
  currentUser,
}) => {
  const { user } = useAuth();
  const activeUser = user || currentUser;

  // Resolve target post ID
  const activePostId = postId || post?.id;
  const postAuthorId = post?.user_id || post?.user?.id;

  const [commentList, setCommentList] = useState(post?.comments || initialComments);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  const commentsEndRef = useRef(null);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch fresh comments from backend when activePostId changes
  useEffect(() => {
    let isMounted = true;

    const fetchComments = async () => {
      if (!activePostId) return;

      setIsLoading(true);
      setError('');

      try {
        const response = await api.get(`/posts/${activePostId}/comments`);
        const fetchedComments = response.data?.data || response.data || [];

        if (isMounted) {
          setCommentList(Array.isArray(fetchedComments) ? fetchedComments : []);
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
        if (isMounted && (post?.comments || initialComments.length > 0)) {
          setCommentList(post?.comments || initialComments);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchComments();

    return () => {
      isMounted = false;
    };
  }, [activePostId]);

  // Submit new comment
  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || !activePostId) return;

    setIsSubmitting(true);
    setError('');

    try {
      let createdComment;

      if (onAddComment) {
        createdComment = await onAddComment(activePostId, trimmed);
      } else {
        const response = await api.post(`/posts/${activePostId}/comments`, {
          content: trimmed,
        });
        createdComment = response.data?.data || response.data;
      }

      const formattedComment = {
        id: createdComment?.id || Date.now(),
        content: trimmed,
        created_at: createdComment?.created_at || new Date().toISOString(),
        user_id: activeUser?.id,
        user: createdComment?.user || {
          id: activeUser?.id,
          name: activeUser?.name || 'You',
          avatar_url: activeUser?.avatar_url || activeUser?.avatarUrl,
        },
      };

      setCommentList((prev) => [...prev, formattedComment]);
      setNewComment('');

      setTimeout(scrollToBottom, 100);

      if (onCommentAdded) {
        onCommentAdded(formattedComment);
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      setError(err.response?.data?.message || 'Failed to submit comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete comment handler
  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    setDeletingId(commentId);
    setError('');

    try {
      await api.delete(`/posts/comments/${commentId}`);
      setCommentList((prev) => prev.filter((item) => item.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      setError(err.response?.data?.message || 'Failed to delete comment.');
    } finally {
      setDeletingId(null);
    }
  };

  const contentJSX = (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-base">
            Comments ({commentList.length})
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Comment List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[160px] bg-gray-50/50">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Loader className="w-6 h-6 text-blue-600" />
            <span className="text-xs text-gray-400 font-medium">Loading comments...</span>
          </div>
        ) : commentList.length > 0 ? (
          <>
            {commentList.map((comment) => {
              const author = comment.user || {};
              const commentUserId = comment.user_id || author.id;

              // Permissions: Allowed if user is commenter OR post author
              const isCommentAuthor = activeUser?.id && commentUserId === activeUser.id;
              const isPostAuthor = activeUser?.id && postAuthorId === activeUser.id;
              const canDelete = isCommentAuthor || isPostAuthor;

              return (
                <div key={comment.id} className="flex gap-3 group items-start">
                  {/* User Avatar Component */}
                  <UserAvatar user={author} className="w-8 h-8 text-xs mt-0.5" />

                  <div className="flex-1 flex items-center justify-between gap-2">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-3 shadow-2xs max-w-[88%] flex-1">
                      <div className="flex justify-between items-baseline mb-1 gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-xs sm:text-sm text-gray-900">
                            {author.name || 'Anonymous'}
                          </span>
                          {commentUserId === postAuthorId && (
                            <span className="text-[9px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.2 rounded-full">
                              Author
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {timeAgo(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>

                    {/* Delete Action Button */}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={deletingId === comment.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 shrink-0"
                        title={
                          isCommentAuthor
                            ? 'Delete your comment'
                            : 'Delete comment on your post'
                        }
                      >
                        {deletingId === comment.id ? (
                          <Loader className="w-3.5 h-3.5 text-red-600" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={commentsEndRef} />
          </>
        ) : (
          <div className="text-center py-10">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs sm:text-sm text-gray-500 font-medium">No comments yet</p>
            <p className="text-xs text-gray-400 mt-0.5">Be the first to share your thoughts!</p>
          </div>
        )}
      </div>

      {/* Comment Input Footer */}
      <div className="p-3 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Active User Avatar */}
          <UserAvatar user={activeUser} className="w-8 h-8 text-xs" />

          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={isSubmitting}
              className="w-full pl-4 pr-10 py-2 bg-gray-100 border border-transparent rounded-full text-xs sm:text-sm focus:outline-hidden focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-full disabled:text-gray-300 disabled:hover:bg-transparent transition-colors"
            >
              {isSubmitting ? (
                <Loader className="w-4 h-4 text-blue-600" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Modal Backdrop Mode (If onClose is passed)
  if (onClose) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
          {contentJSX}
        </div>
      </div>
    );
  }

  // Inline Accordion Mode
  return (
    <div className="bg-white border-t border-gray-100 rounded-b-xl overflow-hidden">
      {contentJSX}
    </div>
  );
};

export default CommentSection;