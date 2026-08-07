import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Heart, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import EventHistory from '../components/profile/EventHistory';
import ProfileHeaderCard from '../components/profile/ProfileHeaderCard';
import EditProfileModal from '../components/profile/EditProfileModal';
import { cn } from '../utils/cn';

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'likes' | 'comments'
  const [profileData, setProfileData] = useState(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    const fetchFullProfile = async () => {
      try {
        setIsFetchingProfile(true);
        const token = localStorage.getItem('token');

        let res = await fetch(`/api/v1/users/${user.id}`, {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });

        if (!res.ok) {
          res = await fetch(`/api/v1/users/profile`, {
            headers: { Authorization: token ? `Bearer ${token}` : '' }
          });
        }

        if (res.ok) {
          const data = await res.json();
          setProfileData(data.data || data);
        }
      } catch (err) {
        console.error('Error fetching profile details:', err);
      } finally {
        setIsFetchingProfile(false);
      }
    };

    fetchFullProfile();
  }, [user]);

  if (!user) return null;

  const currentProfile = profileData || user;
  const postCount = profileData?._count?.posts ?? user?._count?.posts ?? user?.postCount ?? 0;

  const handleLogout = async () => {
    try {
      if (typeof logout === 'function') {
        await logout();
      } else {
        localStorage.removeItem('token');
      }
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    }
  };

  const handleProfileUpdated = (updatedData) => {
    setProfileData(prev => ({ ...prev, ...updatedData }));
    if (updateUser) {
      updateUser(updatedData);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Main Profile Header Card */}
      <ProfileHeaderCard
        currentProfile={currentProfile}
        isFetchingProfile={isFetchingProfile}
        postCount={postCount}
        onOpenEdit={() => setIsEditModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-2" aria-label="Tabs">
          {/* Published Posts */}
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === 'posts'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <FileText className="w-4 h-4" />
            Published Posts ({postCount})
          </button>

          {/* Liked Posts */}
          <button
            onClick={() => setActiveTab('likes')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors",
              activeTab === 'likes'
                ? "border-red-600 text-red-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Heart className="w-4 h-4" />
            Liked Posts
          </button>

          {/* Comments */}
          <button
            onClick={() => setActiveTab('comments')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer transition-colors",
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

      {/* Tab Content Display Area */}
      <div className="py-2">
        {activeTab === 'posts' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <EventHistory 
              userId={user.id} 
              filterTypes={['post']} 
              emptyMessage="No published posts found."
            />
          </div>
        )}

        {activeTab === 'likes' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <EventHistory 
              userId={user.id} 
              filterTypes={['like']} 
              emptyMessage="No liked posts found."
            />
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <EventHistory 
              userId={user.id} 
              filterTypes={['comment']} 
              emptyMessage="No comments added yet."
            />
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentProfile={currentProfile}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
};

export default ProfilePage;