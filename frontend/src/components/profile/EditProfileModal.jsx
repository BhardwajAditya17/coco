import React, { useState } from 'react';
import { X, AlertCircle, Camera, Image as ImageIcon, Save, Loader2 } from 'lucide-react';

const EditProfileModal = ({
  isOpen,
  onClose,
  currentProfile,
  onProfileUpdated
}) => {
  const currentPosition = currentProfile.current_position || currentProfile.currentPosition || '';
  const avatarUrl = currentProfile.avatar_url || currentProfile.avatarUrl || '';

  const [formData, setFormData] = useState({
    bio: currentProfile.bio || '',
    location: currentProfile.location || '',
    current_position: currentPosition,
    avatar_url: avatarUrl
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  if (!isOpen) return null;

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setEditError('Image size must be less than 5MB.');
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, avatar_url: previewUrl }));
    setEditError(null);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setFormData(prev => ({ ...prev, avatar_url: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setEditError(null);

      const token = localStorage.getItem('token');
      const bodyData = new FormData();
      bodyData.append('bio', formData.bio);
      bodyData.append('location', formData.location);
      bodyData.append('current_position', formData.current_position);

      if (selectedFile) {
        bodyData.append('avatar', selectedFile);
      } else if (!formData.avatar_url) {
        bodyData.append('avatar_url', '');
      }

      const response = await fetch(`/api/v1/users/${currentProfile.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: bodyData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update profile (${response.status})`);
      }

      const updated = await response.json();
      const newProfileData = updated.data || updated;

      onProfileUpdated(newProfileData);
      onClose();
    } catch (err) {
      console.error('Profile update error:', err);
      setEditError(err.message || 'Unable to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {editError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Profile Photo */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Profile Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border border-gray-200 overflow-hidden bg-gray-50 shrink-0 flex items-center justify-center">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url?.startsWith('http') || formData.avatar_url?.startsWith('blob:')
                      ? formData.avatar_url
                      : `http://localhost:5002${formData.avatar_url}`
                    }
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className="space-y-2 flex-1">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg cursor-pointer transition-colors border border-gray-200">
                  <Camera className="w-3.5 h-3.5" /> Upload File
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                </label>
                {formData.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="block text-xs text-red-600 hover:underline cursor-pointer"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Current Position */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Current Position / Occupation
            </label>
            <input
              type="text"
              value={formData.current_position}
              onChange={(e) => setFormData({ ...formData, current_position: e.target.value })}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              placeholder="e.g. Civil Servant, Lawyer, Journalist"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
              placeholder="e.g. New Delhi, India"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Bio
            </label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
              placeholder="Tell the community a little about yourself..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;