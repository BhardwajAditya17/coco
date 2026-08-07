import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Briefcase, 
  Building2, 
  User as UserIcon,
  Calendar,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ArrowLeft,
  Share2,
  Check,
  Info,
  FileText,
  Heart,
  MessageCircle,
  MessageSquare
} from 'lucide-react';
import EventHistory from '../components/profile/EventHistory';
import { cn } from '../utils/cn';

const API_BASE_URL = 'http://localhost:5002/api/v1';

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

  return `http://localhost:5002${cleanPath}`;
};

const getRoleLabel = (role) => {
  switch (role?.toLowerCase()) {
    case 'ngo': 
      return 'Registered NGO';
    case 'admin': 
      return 'Administrator';
    default: 
      return 'Social Worker / Volunteer';
  }
};

const ProfileSummaryPage = () => {
  const { id: userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  useEffect(() => {
    if (!userId) return;

    const fetchPublicProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
          headers: {
            Authorization: token ? `Bearer ${token}` : ''
          }
        });

        if (!response.ok) {
          throw new Error('Failed to load profile details.');
        }

        const data = await response.json();
        const userData = data.data || data;

        setProfile(userData);
      } catch (err) {
        console.error('Profile fetch error:', err);
        setError(err.message || 'Unable to load profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchPublicProfile();
  }, [userId]);

  // Direct messaging click handler targeting /chat
  const handleSendMessage = () => {
    if (!userId) return;

    navigate(`/chat?userId=${userId}`, {
      state: {
        recipientId: userId,
        recipient: profile
      }
    });
  };

  const handleShareProfile = async () => {
    const profileUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.name || 'User'}'s Profile`,
          url: profileUrl,
        });
      } catch (err) {
        // Ignored
      }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-gray-600">Loading profile details...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-sm border border-gray-200 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-gray-900">Unable to Display Profile</h2>
          <p className="text-sm text-gray-600">{error || 'User profile not found.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentPosition = profile?.current_position || profile?.currentPosition;
  const rawAvatarUrl = profile?.avatar_url || profile?.avatarUrl;
  const avatarUrl = getImageUrl(rawAvatarUrl);
  const userRole = profile?.role || 'user';
  const isVerified = profile?.aadhaar_status === 'verified' || profile?.aadhaarStatus === 'verified';

  const createdDate = profile?.created_at || profile?.createdAt;
  const joinedDate = createdDate 
    ? new Date(createdDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const postCount = profile?.postsCount ?? profile?.posts_count ?? profile?._count?.posts ?? profile?.posts?.length ?? profile?.postCount ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <h1 className="text-sm font-semibold text-gray-800 truncate">
            {profile.name}'s Profile
          </h1>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendMessage}
              className="inline-flex sm:hidden items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Message
            </button>

            <button
              onClick={handleShareProfile}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              title="Share Profile"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
            <div className="absolute inset-0 bg-black/10"></div>
          </div>

          <div className="px-6 sm:px-8 pb-8">
            <div className="flex justify-between items-end -mt-16 mb-6 relative z-10">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center text-5xl font-bold">
                    {profile.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="hidden sm:block">
                <button
                  onClick={handleSendMessage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" /> Message User
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    {profile.name}
                  </h1>

                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                    userRole === 'ngo' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
                  )}>
                    {userRole === 'ngo' ? <Building2 className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                    {getRoleLabel(userRole)}
                  </span>

                  {isVerified && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                  {currentPosition && (
                    <div className="flex items-center gap-1.5 font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      <span>{currentPosition}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {profile.location || 'Location not set'}
                  </div>

                  {joinedDate && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      Joined {joinedDate}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-row md:flex-col items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 min-w-[160px] shrink-0">
                <div className="text-center w-full">
                  <div className="text-3xl font-bold text-blue-600">
                    {postCount}
                  </div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">
                    Published Posts
                  </div>
                </div>

                <button
                  onClick={handleSendMessage}
                  className="sm:hidden w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </button>
              </div>
            </div>

            <div className="border-b border-gray-200 mt-8 mb-4">
              <nav className="flex flex-wrap space-x-6 sm:space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('about')}
                  className={cn(
                    "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors",
                    activeTab === 'about'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <UserIcon className="w-4 h-4" />
                  About
                </button>

                <button
                  onClick={() => setActiveTab('posts')}
                  className={cn(
                    "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors",
                    activeTab === 'posts'
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Published Posts ({postCount})
                </button>

                <button
                  onClick={() => setActiveTab('likes')}
                  className={cn(
                    "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors",
                    activeTab === 'likes'
                      ? "border-red-600 text-red-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <Heart className="w-4 h-4" />
                  Liked Posts
                </button>

                <button
                  onClick={() => setActiveTab('comments')}
                  className={cn(
                    "whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors",
                    activeTab === 'comments'
                      ? "border-green-600 text-green-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  )}
                >
                  <MessageCircle className="w-4 h-4" />
                  Comments
                </button>
              </nav>
            </div>

            <div className="pt-2">
              {activeTab === 'about' && (
                <div className="space-y-4">
                  {currentPosition && (
                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-200 flex items-center gap-3">
                      <div className="p-2.5 bg-blue-100/70 text-blue-700 rounded-lg shrink-0">
                        <Briefcase className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          Current Position / Role
                        </div>
                        <div className="text-sm font-semibold text-gray-800 mt-0.5">
                          {currentPosition}
                        </div>
                      </div>
                    </div>
                  )}

                  {profile.bio ? (
                    <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-200 space-y-2">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Bio
                      </h3>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {profile.bio}
                      </p>
                    </div>
                  ) : (
                    !currentPosition && (
                      <div className="bg-gray-50/50 p-5 rounded-xl border border-gray-200 flex items-center gap-3 text-gray-500 text-sm">
                        <Info className="w-5 h-5 text-gray-400 shrink-0" />
                        <span>This user has not added a public bio or position yet.</span>
                      </div>
                    )
                  )}
                </div>
              )}

              {activeTab === 'posts' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <EventHistory 
                    userId={profile.id || userId} 
                    filterTypes={['post']}
                    emptyMessage="No published posts found."
                  />
                </div>
              )}

              {activeTab === 'likes' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <EventHistory 
                    userId={profile.id || userId} 
                    filterTypes={['like']}
                    emptyMessage="No liked posts found."
                  />
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <EventHistory 
                    userId={profile.id || userId} 
                    filterTypes={['comment']}
                    emptyMessage="No comments added yet."
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSummaryPage;