import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Share2,
  CheckCircle2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import TagBadge from '../common/TagBadge';
import CommentSection from './CommentSection';
import Loader from '../common/Loader';
import api from '../../services/api';

/**
 * Safely resolves full image URLs for local development and remote storage.
 * Aligned with ProfileSummaryPage to point to backend root server (port 5002).
 */
const getImageUrl = (mediaUrl) => {
  if (!mediaUrl) return null;

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
 * Reusable User Avatar component with error fallback to initial letter
 */
const UserAvatar = ({ user, className = "w-11 h-11 text-base" }) => {
  const [hasError, setHasError] = useState(false);

  // Check all common field names used across backend responses
  const rawUrl = 
    user?.avatar_url || 
    user?.avatarUrl || 
    user?.avatar || 
    user?.profile_picture || 
    user?.profilePicture;

  const avatarUrl = getImageUrl(rawUrl);
  const initial = user?.name?.charAt(0).toUpperCase() || 'U';

  // Reset error state whenever the resolved avatarUrl changes
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold shadow-sm overflow-hidden shrink-0 ${className}`}>
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={user?.name || 'User profile'}
          className="w-full h-full object-cover object-center block"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
};

const timeAgo = (dateString) => {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const PostCard = ({ post, currentUser, onLike, onDelete }) => {
  const navigate = useNavigate();

  const [copied, setCopied] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(null); // Lightbox state
  const [showInlineComments, setShowInlineComments] = useState(false); // Comments toggle
  const [showLikesModal, setShowLikesModal] = useState(false); // Likes modal state
  const [showOptionsMenu, setShowOptionsMenu] = useState(false); // Options menu dropdown toggle
  const [isDeleting, setIsDeleting] = useState(false);

  // Dynamic Likes list state
  const [likesList, setLikesList] = useState(post?.likes || []);
  const [isLoadingLikes, setIsLoadingLikes] = useState(false);

  // Sync likesList when post props update
  useEffect(() => {
    if (post?.likes) {
      setLikesList(post.likes);
    }
  }, [post?.likes]);

  if (!post) return null;

  const author = post.user || {};

  // Robust target user ID extraction for the poster
  const posterId = author.id || author._id || post.user_id || post.userId || post.author_id || post.authorId;

  const isVerified = author.aadhaar_status === 'verified' || author.aadhaarStatus === 'verified';
  const isLiked = post.likes?.some(
    (like) => Number(like.user_id || like.userId || like.id || like._id) === Number(currentUser?.id || currentUser?._id)
  ) || post.isLikedByMe;

  // Authorization check for deleting the post (Post Author OR Admin)
  const isAuthor = Number(currentUser?.id || currentUser?._id) === Number(posterId);
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const canDeletePost = isAuthor || isAdmin;

  // Counts calculations
  const likesCount = post._count?.likes ?? post.likesCount ?? post.likes_count ?? likesList.length ?? 0;
  const commentsCount = post._count?.comments ?? post.commentsCount ?? post.comments_count ?? post.comments?.length ?? 0;

  // Consolidate post media images into an array
  const images = [];
  if (Array.isArray(post.media_urls) && post.media_urls.length > 0) {
    post.media_urls.forEach((url) => {
      const resolved = getImageUrl(url);
      if (resolved) images.push(resolved);
    });
  } else if (post.media_url) {
    const resolved = getImageUrl(post.media_url);
    if (resolved) images.push(resolved);
  }

  // Navigate directly to target profile summary page
  const handleOpenProfileSummary = (e, targetUserId) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    if (targetUserId) {
      navigate(`/profilesummary/${targetUserId}`);
    } else {
      console.warn('Unable to navigate: Target user ID is missing or undefined.', { author, post });
    }
  };

  // Handle post deletion
  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/posts/${post.id}`);
      if (onDelete) {
        onDelete(post.id);
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert(err.response?.data?.message || 'Failed to delete post.');
    } finally {
      setIsDeleting(false);
      setShowOptionsMenu(false);
    }
  };

  // Fetch likes from API when modal is opened
  const handleOpenLikesModal = async () => {
    setShowLikesModal(true);
    setIsLoadingLikes(true);

    try {
      const response = await api.get(`/posts/${post.id}/likes`);
      const fetchedLikes = response.data?.data || response.data || [];
      if (Array.isArray(fetchedLikes)) {
        setLikesList(fetchedLikes);
      }
    } catch (err) {
      console.error('Failed to fetch likes:', err);
      if (post.likes) setLikesList(post.likes);
    } finally {
      setIsLoadingLikes(false);
    }
  };

  const handleShare = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    const shareData = {
      title: `Post by ${author.name || 'Community Member'}`,
      text: post.content?.substring(0, 100) + '...',
      url: postUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(postUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy post link:', err);
      }
    }
  };

  const handleToggleComments = () => {
    setShowInlineComments((prev) => !prev);
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full">Admin</span>;
      case 'ngo':
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-100 text-emerald-700 rounded-full">NGO Partner</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">Volunteer</span>;
    }
  };

  // Lightbox handlers
  const openLightbox = (index) => setActiveImageIndex(index);
  const closeLightbox = () => setActiveImageIndex(null);

  const nextImage = (e) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const renderImageGrid = () => {
    if (images.length === 0) return null;

    const mainImage = images[0];
    const subImages = images.slice(1);

    return (
      <div className="w-full bg-white overflow-hidden flex flex-col gap-1">
        {/* Main 1st Image */}
        <div
          className="w-full max-h-[460px] overflow-hidden cursor-pointer relative group flex items-center justify-center bg-gray-100"
          onClick={() => openLightbox(0)}
        >
          <img
            src={mainImage}
            alt="Post main attachment"
            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300 max-h-[460px]"
            loading="lazy"
          />
        </div>

        {/* Sub-images row */}
        {subImages.length > 0 && (
          <div
            className={`grid gap-1 w-full ${
              subImages.length === 1
                ? 'grid-cols-1'
                : subImages.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3'
            }`}
          >
            {subImages.slice(0, 3).map((imgUrl, idx) => {
              const actualIndex = idx + 1;
              const isThirdThumb = idx === 2;
              const extraCount = images.length - 4;

              return (
                <div
                  key={actualIndex}
                  className="relative aspect-square overflow-hidden cursor-pointer group bg-gray-100"
                  onClick={() => openLightbox(actualIndex)}
                >
                  <img
                    src={imgUrl}
                    alt={`Post attachment ${actualIndex + 1}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    loading="lazy"
                  />

                  {isThirdThumb && extraCount > 0 && (
                    <div className="absolute inset-0 bg-black/65 flex items-center justify-center text-white text-xl sm:text-2xl font-bold backdrop-blur-[2px] group-hover:bg-black/75 transition-colors">
                      +{extraCount}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 flex items-start justify-between relative">
        <div className="flex items-center gap-3">
          {/* Clickable Author Profile Trigger */}
          <button
            type="button"
            onClick={(e) => handleOpenProfileSummary(e, posterId)}
            className="flex items-center gap-3 text-left group focus:outline-none cursor-pointer"
          >
            <UserAvatar 
              user={author} 
              className="w-11 h-11 text-base group-hover:ring-2 ring-blue-500 ring-offset-1 transition-all"
            />

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-gray-900 group-hover:text-blue-600 text-sm md:text-base transition-colors">
                  {author.name || 'Anonymous User'}
                </span>

                {isVerified && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600" title="Identity Verified" />
                )}

                {getRoleBadge(author.role)}
              </div>

              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <span>{author.location || 'India'}</span>
                <span>•</span>
                <span className="text-gray-400">{timeAgo(post.created_at)}</span>
              </div>
            </div>
          </button>
        </div>

        {/* Options Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setShowOptionsMenu((prev) => !prev)}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Post options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showOptionsMenu && (
            <>
              {/* Invisible backdrop to close menu on click outside */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowOptionsMenu(false)}
              />

              <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 overflow-hidden">
                {canDeletePost ? (
                  <button
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="w-full px-4 py-2.5 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>{isDeleting ? 'Deleting...' : 'Delete Post'}</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 text-xs text-gray-400 font-medium text-center">
                    No options available
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 text-sm md:text-base whitespace-pre-wrap leading-relaxed mb-3">
          {post.content}
        </p>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.map((pt) => {
              const tagObj = pt.tag || pt;
              return <TagBadge key={tagObj.id || tagObj.name} name={tagObj.name} />;
            })}
          </div>
        )}
      </div>

      {/* Main Image + Bottom Thumbnail Grid */}
      {renderImageGrid()}

      {/* Footer Reactions & Actions */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        {/* Counts summary row */}
        <div className="flex justify-between items-center text-xs text-gray-500 px-1 mb-2 font-medium">
          {/* Clickable Likes Count */}
          <button
            type="button"
            onClick={handleOpenLikesModal}
            className="hover:underline hover:text-blue-600 cursor-pointer transition-colors"
          >
            {likesCount} {likesCount === 1 ? 'Like' : 'Likes'}
          </button>

          {/* Clickable Comments Count */}
          <button
            type="button"
            onClick={handleToggleComments}
            className="hover:underline hover:text-blue-600 cursor-pointer transition-colors"
          >
            {commentsCount} {commentsCount === 1 ? 'Comment' : 'Comments'}
          </button>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between border-t border-gray-200 pt-1.5">
          <button
            onClick={onLike}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all font-medium text-xs sm:text-sm ${
              isLiked
                ? 'text-blue-600 bg-blue-50/80 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-blue-600 text-blue-600' : ''}`} />
            <span>{isLiked ? 'Liked' : 'Like'}</span>
            {likesCount > 0 && <span className="text-xs opacity-75">({likesCount})</span>}
          </button>

          <button
            onClick={handleToggleComments}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm ${
              showInlineComments ? 'text-blue-600 bg-blue-50/80 font-semibold' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comment</span>
            {commentsCount > 0 && <span className="text-xs opacity-75">({commentsCount})</span>}
          </button>

          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium text-xs sm:text-sm relative"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Comments Section */}
      {showInlineComments && (
        <CommentSection
          post={post}
          postId={post.id}
          comments={post.comments || []}
          currentUser={currentUser}
        />
      )}

      {/* "Who Liked This Post" Modal */}
      {showLikesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowLikesModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-5 h-5 text-blue-600 fill-blue-600" />
                <h3 className="font-semibold text-gray-900 text-base">Liked by</h3>
              </div>
              <button
                onClick={() => setShowLikesModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Users List */}
            <div className="max-h-80 overflow-y-auto p-4 space-y-3 divide-y divide-gray-50">
              {isLoadingLikes ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Loader className="w-6 h-6 text-blue-600" />
                  <span className="text-xs text-gray-400 font-medium">Loading likes...</span>
                </div>
              ) : likesList.length > 0 ? (
                likesList.map((like, index) => {
                  const u = like.user || like;
                  const targetUserId = u.id || u._id || u.user_id || u.userId;

                  return (
                    <div key={like.id || index} className="flex items-center justify-between pt-2 first:pt-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          setShowLikesModal(false);
                          handleOpenProfileSummary(e, targetUserId);
                        }}
                        className="flex items-center gap-3 group text-left cursor-pointer"
                      >
                        <UserAvatar 
                          user={u} 
                          className="w-10 h-10 text-sm group-hover:opacity-90 transition-opacity" 
                        />
                        <div>
                          <span className="font-semibold text-gray-900 group-hover:text-blue-600 text-sm block">
                            {u.name || 'Community Member'}
                          </span>
                          {u.role && getRoleBadge(u.role)}
                        </div>
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No likes record available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {activeImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors z-10"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Counter Badge */}
          <div className="absolute top-4 left-4 text-white/80 bg-black/50 px-3 py-1 rounded-full text-xs sm:text-sm font-medium z-10">
            {activeImageIndex + 1} / {images.length}
          </div>

          {/* Previous Arrow */}
          {images.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-4 p-2 sm:p-3 text-white/80 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}

          {/* Image Container */}
          <div
            className="relative max-w-5xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[activeImageIndex]}
              alt={`Attachment ${activeImageIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Next Arrow */}
          {images.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-4 p-2 sm:p-3 text-white/80 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PostCard;