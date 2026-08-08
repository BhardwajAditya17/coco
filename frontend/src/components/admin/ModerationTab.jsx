import React, { useState } from 'react';
import { ShieldAlert, Trash2, CheckCircle } from 'lucide-react';

export const ModerationTab = ({
  posts,
  loading,
  pagination,
  setPage,
  onDeletePost,
  onDismissFlags,
}) => {
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, postId: null });
  const [reason, setReason] = useState('');

  const confirmDelete = () => {
    if (deleteModal.postId) {
      onDeletePost(deleteModal.postId, reason);
      setDeleteModal({ isOpen: false, postId: null });
      setReason('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Content Moderation Queue</h2>
        <p className="text-sm text-gray-500">Review flagged user posts for community standard violations.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Loading flagged posts...</div>
      ) : posts.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-gray-500 space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
          <p className="text-base font-bold text-gray-800">Queue is clear!</p>
          <p className="text-xs text-gray-400">No reported or flagged posts awaiting review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{post.author?.name || 'Unknown Author'}</span>
                  <span className="text-xs text-gray-400">({post.author?.email})</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Flagged
                  </span>
                </div>

                <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-line">
                  {post.content || post.text || 'No text content'}
                </p>

                {post.mediaUrls?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-1">
                    {post.mediaUrls.map((url, i) => (
                      <img key={i} src={url} alt="Post Attachment" className="w-20 h-20 rounded-lg object-cover border" />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex md:flex-col justify-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
                <button
                  onClick={() => onDismissFlags(post.id)}
                  className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 flex items-center gap-1 justify-center"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Dismiss Flags
                </button>
                <button
                  onClick={() => setDeleteModal({ isOpen: true, postId: post.id })}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1 justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Post
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Reason Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Remove Violating Post</h3>
            <p className="text-xs text-gray-500 mt-1">Provide removal justification for audit logs:</p>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Inappropriate media, spam, toxic behavior..."
              className="w-full mt-3 p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, postId: null })}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};