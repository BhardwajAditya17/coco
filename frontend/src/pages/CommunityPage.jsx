import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Users, 
  MapPin, 
  Briefcase, 
  Building2, 
  User as UserIcon, 
  ShieldCheck, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight, 
  Loader2,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { cn } from '../utils/cn';

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

const CommunityPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  // State Management
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const limit = 9;

  const fetchCommunityMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit,
        ...(searchQuery.trim() && { search: searchQuery.trim() }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      };

      const response = await api.get('/users', { params });
      const responseData = response.data?.data || response.data || {};

      const rawUserList = Array.isArray(responseData) 
        ? responseData 
        : responseData.users || responseData.data || [];

      // 👈 Filter out current logged-in user from the list
      const userList = rawUserList.filter(
        (member) => String(member.id) !== String(currentUser?.id)
      );

      const calculatedTotal = responseData.total || responseData.count || userList.length;
      const calculatedPages = responseData.totalPages || Math.ceil(calculatedTotal / limit) || 1;

      setUsers(userList);
      setTotalUsers(calculatedTotal);
      setTotalPages(calculatedPages);
    } catch (err) {
      console.error('Error loading community members:', err);
      setError('Unable to load community members. Please check your backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityMembers();
  }, [page, roleFilter, currentUser?.id]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCommunityMembers();
  };

  const handleMessageUser = (targetUser, e) => {
    e.stopPropagation();
    navigate(`/chat?userId=${targetUser.id}`, {
      state: {
        recipientId: targetUser.id,
        recipient: targetUser,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/60 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs mb-8">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
              <Users className="w-3.5 h-3.5" /> Community Directory
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Connect with Platform Members
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Discover registered NGOs, active social workers, and volunteers contributing to community initiatives across the network.
            </p>
          </div>

          {/* Search Bar & Role Filters */}
          <div className="mt-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pt-6 border-t border-gray-100">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search members by name, position, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Search
              </button>
            </form>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-semibold text-gray-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              
              {[
                { id: 'all', label: 'All Members' },
                { id: 'user', label: 'Volunteers / Workers' },
                { id: 'ngo', label: 'NGOs' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setRoleFilter(tab.id);
                    setPage(1);
                  }}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer",
                    roleFilter === tab.id
                      ? "bg-gray-900 text-white shadow-2xs"
                      : "bg-gray-100/80 text-gray-600 hover:bg-gray-200/80"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Member Cards Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs font-medium">Loading community directory...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 text-center max-w-md mx-auto border border-gray-200 shadow-xs space-y-3">
            <p className="text-xs font-medium text-rose-600">{error}</p>
            <button
              onClick={fetchCommunityMembers}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs space-y-3 max-w-lg mx-auto">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto text-gray-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No members found</h3>
            <p className="text-xs text-gray-500">
              We couldn't find any community members matching your current filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((member) => {
              const avatarUrl = getImageUrl(member.avatar_url || member.avatarUrl);
              const isNGO = member.role?.toLowerCase() === 'ngo';
              const position = member.current_position || member.currentPosition;
              const isVerified = member.aadhaar_status === 'verified' || member.aadhaarStatus === 'verified';

              return (
                <div
                  key={member.id}
                  onClick={() => navigate(`/profilesummary/${member.id}`)}
                  className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md hover:border-gray-300 transition-all flex flex-col justify-between group cursor-pointer"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      {/* Round Avatar Container */}
                      <div className="relative">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={member.name}
                            className="w-14 h-14 rounded-full object-cover border border-gray-200 shadow-2xs"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-2xs">
                            {member.name?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                        isNGO 
                          ? "bg-purple-50 text-purple-700 border-purple-200" 
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      )}>
                        {isNGO ? <Building2 className="w-3 h-3" /> : <UserIcon className="w-3 h-3" />}
                        {isNGO ? 'NGO' : 'Social Worker'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-600 transition-colors truncate">
                          {member.name}
                        </h3>
                        {isVerified && (
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" title="Verified Member" />
                        )}
                      </div>

                      {position && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-600">
                          <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{position}</span>
                        </div>
                      )}

                      {member.location && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{member.location}</span>
                        </div>
                      )}

                      {member.bio && (
                        <p className="text-xs text-gray-500 line-clamp-2 pt-2 border-t border-gray-100 mt-3 leading-relaxed">
                          {member.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center gap-2">
                    <button
                      onClick={(e) => handleMessageUser(member, e)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Message
                    </button>

                    <button
                      onClick={() => navigate(`/profilesummary/${member.id}`)}
                      className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                      title="View Profile Summary"
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && totalPages > 1 && (
          <div className="mt-10 bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-gray-500 font-medium">
              Showing page <span className="font-bold text-gray-900">{page}</span> of{' '}
              <span className="font-bold text-gray-900">{totalPages}</span> ({totalUsers} total members)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer",
                      page === p
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CommunityPage;