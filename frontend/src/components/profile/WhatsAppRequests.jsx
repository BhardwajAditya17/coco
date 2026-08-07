import React, { useState, useEffect } from 'react';
import { MessageSquare, Check, Loader2, UserCheck, MessageCircle, AlertCircle } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

const WhatsAppRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);

  // Fetch pending WhatsApp connection requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('/api/v1/whatsapp/requests', {
          headers: { Authorization: token ? `Bearer ${token}` : '' }
        });

        if (res.ok) {
          const data = await res.json();
          setRequests(data.data || data || []);
        } else {
          // Placeholder fallback data for initial UI rendering
          setRequests([]);
        }
      } catch (err) {
        console.error('Error fetching WhatsApp requests:', err);
        setError('Failed to load WhatsApp requests.');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  // Handle confirming a WhatsApp connection request
  const handleConfirmRequest = async (requestId, senderPhone) => {
    try {
      setActionLoadingId(requestId);
      const token = localStorage.getItem('token');

      const res = await fetch(`/api/v1/whatsapp/requests/${requestId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to confirm request');
      }

      const responseData = await res.json();
      const whatsappNumber = responseData.whatsappNumber || senderPhone;

      // Update state to reflect confirmation
      setRequests(prev =>
        prev.map(req => req.id === requestId ? { ...req, status: 'ACCEPTED' } : req)
      );

      // Open direct WhatsApp chat if phone number is returned
      if (whatsappNumber) {
        const cleanedPhone = whatsappNumber.replace(/[^0-9]/g, '');
        const message = encodeURIComponent("Hello! I accepted your connection request on Community Connect.");
        window.open(`https://wa.me/${cleanedPhone}?text=${message}`, '_blank');
      }
    } catch (err) {
      console.error('Confirm error:', err);
      alert(err.message || 'Error confirming WhatsApp request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        <p className="text-sm">Loading WhatsApp requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" /> WhatsApp Connection Requests
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage incoming requests from members who want to connect with you directly on WhatsApp.
          </p>
        </div>
        <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full border border-green-200">
          {requests.filter(r => r.status !== 'ACCEPTED').length} Pending
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No pending WhatsApp requests</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            When other users request to connect with you via WhatsApp, their invitations will appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {requests.map((request) => {
            const sender = request.sender || request.user || {};
            const isConfirmed = request.status === 'ACCEPTED';
            const isProcessing = actionLoadingId === request.id;

            return (
              <div key={request.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-50 text-green-700 font-bold text-lg flex items-center justify-center border border-green-200 shrink-0 overflow-hidden">
                    {sender.avatar_url ? (
                      <img src={sender.avatar_url} alt={sender.name} className="w-full h-full object-cover" />
                    ) : (
                      sender.name?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-sm">{sender.name || 'Community Member'}</h4>
                    <p className="text-xs text-gray-500">{sender.current_position || sender.role || 'Member'}</p>
                    <span className="text-[11px] text-gray-400 mt-0.5 block">
                      Requested {formatDate(request.createdAt || request.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {isConfirmed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      <UserCheck className="w-4 h-4" /> Connected
                    </span>
                  ) : (
                    <button
                      onClick={() => handleConfirmRequest(request.id, sender.phone || request.phone)}
                      disabled={isProcessing}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirm & Chat
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WhatsAppRequests;