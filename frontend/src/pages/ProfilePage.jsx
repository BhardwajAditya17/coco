import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import EventHistory from '../components/profile/EventHistory';
import ProfileHeaderCard from '../components/profile/ProfileHeaderCard';
import WhatsAppRequests from '../components/profile/WhatsAppRequests';
import EditProfileModal from '../components/profile/EditProfileModal';
import { cn } from '../utils/cn';

const ProfilePage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('activity');
  const [profileData, setProfileData] = useState(null);
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch full profile on mount
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

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-2" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('activity')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer",
              activeTab === 'activity'
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Activity className="w-4 h-4" />
            Recent Activity
          </button>

          <button
            onClick={() => setActiveTab('whatsapp_requests')}
            className={cn(
              "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 cursor-pointer",
              activeTab === 'whatsapp_requests'
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Requests
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-2">
        {activeTab === 'activity' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <EventHistory userId={user.id} />
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <WhatsAppRequests />
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