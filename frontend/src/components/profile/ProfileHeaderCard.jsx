import React from 'react';
import { 
  Camera, Edit2, LogOut, Briefcase, Mail, MapPin, 
  Calendar, CreditCard, Building2, User as UserIcon, Loader2 
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import { cn } from '../../utils/cn';

const ProfileHeaderCard = ({
  currentProfile,
  isFetchingProfile,
  postCount,
  onOpenEdit,
  onLogout
}) => {
  const currentPosition = currentProfile.current_position || currentProfile.currentPosition;
  const avatarUrl = currentProfile.avatar_url || currentProfile.avatarUrl;
  const userRole = currentProfile.role || 'user';
  const feeStatus = (currentProfile.fee_status || currentProfile.feeStatus || 'unpaid').toLowerCase();

  const getRoleLabel = (role) => {
    switch (role?.toLowerCase()) {
      case 'ngo': return 'Registered NGO';
      case 'admin': return 'Administrator';
      default: return 'Social Worker / Volunteer';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Cover Banner */}
      <div className="h-40 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>

      <div className="px-6 sm:px-8 pb-8">
        {/* Avatar & Action Header */}
        <div className="flex justify-between items-end -mt-16 mb-6 relative z-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-md flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl?.startsWith('http') ? avatarUrl : `http://localhost:5002${avatarUrl}`}
                  alt={currentProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center text-5xl font-bold">
                  {currentProfile.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <button
              onClick={onOpenEdit}
              title="Change profile photo"
              className="absolute bottom-1 right-1 p-2 bg-gray-900/80 hover:bg-black text-white rounded-full shadow-lg transition-all transform hover:scale-105 border-2 border-white cursor-pointer"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenEdit}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>

        {/* User Details */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                {currentProfile.name}
              </h1>

              {/* Role Badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                userRole === 'ngo' ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                {userRole === 'ngo' ? <Building2 className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                {getRoleLabel(userRole)}
              </span>

              {/* Fee Badge */}
              <span className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border",
                feeStatus === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-700 border-gray-200"
              )}>
                <CreditCard className="w-3.5 h-3.5" />
                {feeStatus === 'paid' ? 'Fee Paid' : 'Fee Unpaid'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
              {currentPosition && (
                <div className="flex items-center gap-1.5 font-medium text-blue-700 bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-100">
                  <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                  {currentPosition}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-gray-400" />
                {currentProfile.email}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
                {currentProfile.location || 'Location not set'}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-400" />
                Joined {formatDate(currentProfile.createdAt || currentProfile.created_at)}
              </div>
            </div>

            {currentProfile.bio && (
              <p className="text-gray-600 max-w-2xl mt-4 leading-relaxed">
                {currentProfile.bio}
              </p>
            )}
          </div>

          {/* Quick Stats */}
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 min-w-[140px]">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {isFetchingProfile ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-blue-600" />
                ) : (
                  postCount
                )}
              </div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">Posts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeaderCard;