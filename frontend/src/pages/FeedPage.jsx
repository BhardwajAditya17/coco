import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

// Modular components
import PostCard from '../components/feed/PostCard';
import CreatePostModal from '../components/feed/CreatePostModal';
import EventTagFilter from '../components/feed/EventTagFilter';
import CommentSection from '../components/feed/CommentSection';
import Button from '../components/common/Button';
import Sidebar from '../components/common/Sidebar';

// Icons
import { 
  PlusCircle, 
  RefreshCw, 
  Search, 
  ShieldCheck, 
  TrendingUp, 
  HeartHandshake, 
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const FeedPage = () => {
  const { user } = useAuth();

  // Sidebar Collapse State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Feed State
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Tag Filtering
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Active State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);

  /**
   * Fetch Feed Posts from GET /api/v1/posts
   */
  const fetchPosts = useCallback(async (pageNum = 1, tag = null) => {
    try {
      setIsLoading(true);
      setError(null);

      const params = { page: pageNum, limit: 10 };
      if (tag && tag !== 'All') {
        params.tag = tag.replace(/^#/, '');
      }

      const response = await api.get('/posts', { params });
      
      const fetchedPosts = response.data?.data || response.data?.posts || [];
      const meta = response.data?.meta || {};

      setPosts(fetchedPosts);
      setTotalPages(meta.totalPages || 1);
      setPage(meta.page || pageNum);
    } catch (err) {
      console.error('Error loading feed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load community feed.');
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, selectedTag);
  }, [selectedTag, fetchPosts]);

  /**
   * Filter posts locally by client search query
   */
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const query = searchQuery.toLowerCase();
    return posts.filter(
      (post) =>
        post.content?.toLowerCase().includes(query) ||
        post.user?.name?.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const handleTagSelect = (tag) => {
    const newTag = selectedTag === tag ? null : tag;
    setSelectedTag(newTag);
    setPage(1);
  };

  const handlePostCreated = (newPost) => {
    setPosts((prevPosts) => [newPost, ...prevPosts]);
    setIsCreateModalOpen(false);
  };

  // Immediate UI update when a post is deleted
  const handlePostDeleted = (deletedPostId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== deletedPostId));
  };

  const handleLikeToggle = async (postId) => {
    const previousPosts = [...posts];

    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const currentLikes = p._count?.likes ?? p.likes?.length ?? 0;
          const hasLiked = p.likes?.some((l) => l.user_id === user?.id) || p.isLikedByMe;
          const newIsLiked = !hasLiked;
          const newCount = newIsLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);

          return {
            ...p,
            isLikedByMe: newIsLiked,
            likes: newIsLiked
              ? [...(p.likes || []), { user_id: user?.id }]
              : (p.likes || []).filter((l) => l.user_id !== user?.id),
            _count: { ...p._count, likes: newCount },
          };
        }
        return p;
      })
    );

    try {
      await api.post(`/posts/${postId}/like`);
    } catch (err) {
      console.error('Error toggling post like:', err);
      setPosts(previousPosts);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      
      {/* Sticky Filter Bar */}
      <EventTagFilter
        selectedTag={selectedTag}
        onSelectTag={handleTagSelect}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 transition-all duration-300">
          
          {/* Left Sidebar (Collapsible) */}
          <aside 
            className={cn(
              "hidden lg:block transition-all duration-300 ease-in-out",
              isSidebarCollapsed ? "lg:col-span-1" : "lg:col-span-3"
            )}
          >
            <div className="sticky top-24">
              <Sidebar 
                isCollapsed={isSidebarCollapsed} 
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
              />
            </div>
          </aside>

          {/* Main Social Feed (Expands when sidebar collapses) */}
          <main 
            className={cn(
              "col-span-1 transition-all duration-300 ease-in-out space-y-6",
              isSidebarCollapsed ? "lg:col-span-8" : "lg:col-span-6"
            )}
          >
            
            {/* Action Bar & Search Header */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <span>Community Feed</span>
                    <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Connect with local NGOs, volunteers, and emergency drives.
                  </p>
                </div>

                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="hidden sm:flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-md transition-all font-medium text-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Post</span>
                </Button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search posts, volunteers, or drives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between text-sm">
                <span>{error}</span>
                <button
                  onClick={() => fetchPosts(page, selectedTag)}
                  className="p-1.5 hover:bg-red-100 rounded-lg text-red-800 transition-colors"
                  title="Retry fetching posts"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Skeleton Loading State */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm animate-pulse space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gray-200 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-3 bg-gray-150 rounded w-1/4" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                      <div className="h-4 bg-gray-200 rounded w-5/6" />
                    </div>
                    <div className="h-48 bg-gray-100 rounded-xl w-full" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length > 0 ? (
              <div className="space-y-4">
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUser={user}
                    onLike={() => handleLikeToggle(post.id)}
                    onDelete={handlePostDeleted}
                    onOpenComments={() => setActiveCommentPost(post)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">No community posts found</h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                  {selectedTag
                    ? `No active requests or updates under #${selectedTag}.`
                    : 'Your community feed is quiet right now. Start a new initiative!'}
                </p>
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm"
                >
                  Create First Post
                </Button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && !isLoading && (
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                <Button
                  disabled={page <= 1}
                  onClick={() => fetchPosts(page - 1, selectedTag)}
                  className="px-3.5 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm disabled:opacity-50 flex items-center gap-1 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </Button>
                <span className="text-xs sm:text-sm text-gray-600 font-medium">
                  Page {page} of {totalPages}
                </span>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => fetchPosts(page + 1, selectedTag)}
                  className="px-3.5 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm disabled:opacity-50 flex items-center gap-1 hover:bg-gray-50"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </main>

          {/* Right Sidebar Widget */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6">
            <div className="sticky top-24 space-y-6">
              
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  <span className="text-xs font-semibold tracking-wide uppercase text-blue-100">
                    Verification
                  </span>
                </div>
                <h4 className="font-bold text-base leading-snug">
                  {user?.aadhaar_status === 'verified'
                    ? 'Verified Community Partner'
                    : 'Complete Your Verification'}
                </h4>
                <p className="text-xs text-blue-100 leading-relaxed">
                  {user?.aadhaar_status === 'verified'
                    ? 'Your identity is verified. You can post official NGO updates and drives.'
                    : 'Verify your identity to build trust and post official NGO volunteer requests.'}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm border-b border-gray-100 pb-3">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Community Impact</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-lg font-bold text-gray-900">{posts.length}</div>
                    <div className="text-[11px] text-gray-500 font-medium">Active Posts</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <div className="text-lg font-bold text-blue-600">24/7</div>
                    <div className="text-[11px] text-gray-500 font-medium">Helpline Active</div>
                  </div>
                </div>
              </div>

            </div>
          </aside>

        </div>
      </div>

      {/* Mobile Floating Action Button (FAB) */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-95"
        aria-label="Create Post"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <CreatePostModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Modal Drawer for Comments */}
      {activeCommentPost && (
        <CommentSection
          post={activeCommentPost}
          onClose={() => setActiveCommentPost(null)}
          onCommentAdded={() => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === activeCommentPost.id
                  ? { ...p, _count: { ...p._count, comments: (p._count?.comments || 0) + 1 } }
                  : p
              )
            );
          }}
        />
      )}
    </div>
  );
};

export default FeedPage;