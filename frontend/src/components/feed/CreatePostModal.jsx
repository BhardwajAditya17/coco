import React, { useState, useRef, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  X, 
  Tag as TagIcon, 
  Loader2, 
  AlertCircle, 
  Plus, 
  ChevronDown 
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../common/Button';
import { cn } from '../../utils/cn';

const MAX_FILES = 5;

// Allowed preset tags matching EventTagFilter
const PRESET_TAGS = [
  'BloodDonation',
  'Education',
  'FoodDrive',
  'DisasterRelief',
  'AnimalWelfare',
  'Environment',
  'HealthCamp',
  'NGO',
  'Volunteering'
];

const CreatePostModal = ({
  isOpen,
  onClose,
  onPostCreated,
  fileFieldName = 'media',
}) => {
  const { user } = useAuth();

  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [isTagMenuOpen, setIsTagMenuOpen] = useState(false);
  
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);
  const tagDropdownRef = useRef(null);

  // Revoke object URLs on unmount/change
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Click outside listener to close tag dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
        setIsTagMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files || []);
    setError('');

    if (selectedFiles.length + newFiles.length > MAX_FILES) {
      setError(`You can upload a maximum of ${MAX_FILES} images per post.`);
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of newFiles) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 5MB size limit.`);
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        setError(`"${file.name}" is an unsupported file type.`);
        return;
      }

      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setPreviewUrls((prev) => [...prev, ...newPreviews]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (indexToRemove) => {
    URL.revokeObjectURL(previewUrls[indexToRemove]);
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // --- Search & Select Tag Logic ---
  const cleanInput = tagInput.replace(/^#/, '').trim();

  // Filter preset tags that match search input and are not already selected
  const filteredPresets = PRESET_TAGS.filter((preset) => {
    const isAlreadySelected = tags.some((t) => t.toLowerCase() === preset.toLowerCase());
    const matchesSearch = preset.toLowerCase().includes(cleanInput.toLowerCase());
    return !isAlreadySelected && matchesSearch;
  });

  const handleSelectTag = (tagToAdd) => {
    if (!tags.some((t) => t.toLowerCase() === tagToAdd.toLowerCase())) {
      setTags((prev) => [...prev, tagToAdd]);
    }
    setTagInput('');
    setIsTagMenuOpen(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Pressing Enter selects the top matched result from the search list
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPresets.length > 0) {
        handleSelectTag(filteredPresets[0]);
      }
    }
  };

  // --- Form Submission ---
  const handleSubmit = async () => {
    if (!content.trim() && selectedFiles.length === 0) return;

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('content', content.trim());

      // Only send tags that were explicitly selected
      if (tags.length > 0) {
        formData.append('tags', JSON.stringify(tags));
      }

      // Append files
      selectedFiles.forEach((file) => {
        formData.append(fileFieldName, file);
      });

      const response = await api.post('/posts', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newPost = response.data?.data || response.data;

      // Reset Modal State
      setContent('');
      setTags([]);
      setTagInput('');
      setSelectedFiles([]);
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      setPreviewUrls([]);

      if (onPostCreated) onPostCreated(newPost);
      onClose();
    } catch (err) {
      console.error('Failed to create post:', err);
      const serverMessage = err.response?.data?.message || err.message;
      setError(serverMessage || 'Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPostEmpty = !content.trim() && selectedFiles.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create Community Post</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">{user?.name || 'Community Member'}</div>
              <span className="text-[11px] text-gray-400 capitalize">{user?.role || 'Volunteer'}</span>
            </div>
          </div>

          <textarea
            placeholder="Share an update, request volunteers, or report a local issue..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full resize-none border-none focus:ring-0 text-sm sm:text-base placeholder-gray-400 min-h-[110px] outline-none text-gray-800 leading-relaxed"
            autoFocus
          />

          {/* Image Previews Grid */}
          {previewUrls.length > 0 && (
            <div className={`grid gap-2 ${previewUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative rounded-xl overflow-hidden bg-gray-900 border border-gray-200 h-28 group">
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/70 text-white rounded-full hover:bg-black transition-colors z-10"
                    title="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}

              {previewUrls.length < MAX_FILES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-28 rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50/50 flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 transition-all"
                >
                  <Plus className="w-6 h-6 mb-1" />
                  <span className="text-xs font-medium">Add More</span>
                </button>
              )}
            </div>
          )}

          {/* Searchable and Selectable Tag Dropdown */}
          <div className="space-y-2 pt-2 border-t border-gray-100 relative" ref={tagDropdownRef}>
            {/* Selected Tag Chips */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-fade-in"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-blue-900 rounded-full p-0.5"
                      title="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Combobox Search Input */}
            <div className="relative flex items-center">
              <TagIcon className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search and select tags..."
                value={tagInput}
                onFocus={() => setIsTagMenuOpen(true)}
                onChange={(e) => {
                  setTagInput(e.target.value);
                  setIsTagMenuOpen(true);
                }}
                onKeyDown={handleTagKeyDown}
                className="w-full text-xs sm:text-sm border border-gray-200 rounded-xl pl-9 pr-8 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-all cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setIsTagMenuOpen((prev) => !prev)}
                className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isTagMenuOpen && "rotate-180")} />
              </button>
            </div>

            {/* Search Dropdown Menu */}
            {isTagMenuOpen && (
              <div className="absolute left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl py-1 text-xs sm:text-sm">
                {filteredPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleSelectTag(preset)}
                    className="w-full text-left px-3.5 py-2 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-between transition-colors text-gray-700 font-medium"
                  >
                    <span>#{preset}</span>
                    <Plus className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                ))}

                {/* Empty State */}
                {filteredPresets.length === 0 && (
                  <div className="px-3.5 py-3 text-center text-gray-400 text-xs">
                    No matching tags found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/80">
          <div>
            <input
              type="file"
              multiple
              accept="image/jpeg, image/png, image/webp, image/gif"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={selectedFiles.length >= MAX_FILES}
              className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 text-xs sm:text-sm font-medium disabled:opacity-50"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>
                {selectedFiles.length > 0 ? `Photos (${selectedFiles.length}/${MAX_FILES})` : 'Add Photos'}
              </span>
            </button>
          </div>

          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPostEmpty || isSubmitting}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs sm:text-sm flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'Posting...' : 'Post'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;