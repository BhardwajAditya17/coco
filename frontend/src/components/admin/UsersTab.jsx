import React, { useState } from 'react';
import { Search, Filter, Trash2, UserX, UserCheck } from 'lucide-react';

export const UsersTab = ({
  users,
  loading,
  filters,
  setFilters,
  pagination,
  onToggleStatus,
  onUpdateRole,
  onDeleteUser,
}) => {
  const [reasonModal, setReasonModal] = useState({ isOpen: false, user: null, targetStatus: false });
  const [banReason, setBanReason] = useState('');

  const handleSearchChange = (e) => {
    setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleRoleFilter = (e) => {
    setFilters((prev) => ({ ...prev, role: e.target.value, page: 1 }));
  };

  const handleStatusFilter = (e) => {
    setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }));
  };

  const openBanModal = (user, targetStatus) => {
    if (!targetStatus) {
      // Unbanning doesn't mandate a reason modal
      onToggleStatus(user.id, false, '');
      return;
    }
    setReasonModal({ isOpen: true, user, targetStatus });
  };

  const confirmBan = () => {
    if (reasonModal.user) {
      onToggleStatus(reasonModal.user.id, true, banReason);
      setReasonModal({ isOpen: false, user: null, targetStatus: false });
      setBanReason('');
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row gap-3 justify-between items-center shadow-2xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
            <Filter className="w-4 h-4" /> Filters:
          </div>
          <select
            value={filters.role}
            onChange={handleRoleFilter}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="MODERATOR">Moderator</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            value={filters.status}
            onChange={handleStatusFilter}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-2 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* User Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Posts</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-gray-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-gray-400">
                    No users match search criteria.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={u.role}
                        onChange={(e) => onUpdateRole(u.id, e.target.value)}
                        className="text-xs font-semibold bg-gray-100 border border-gray-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="USER">USER</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5">
                      {u.isBanned ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                          Banned
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-700">
                      {u._count?.posts ?? 0}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => openBanModal(u, !u.isBanned)}
                        className={`p-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1 transition-colors ${
                          u.isBanned
                            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                        }`}
                        title={u.isBanned ? 'Unban Account' : 'Ban Account'}
                      >
                        {u.isBanned ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                        {u.isBanned ? 'Unban' : 'Ban'}
                      </button>

                      <button
                        onClick={() => onDeleteUser(u.id)}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 inline-flex items-center text-xs font-semibold"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 border rounded-md disabled:opacity-50 hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ban Reason Modal */}
      {reasonModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Ban Account</h3>
            <p className="text-xs text-gray-500 mt-1">
              Specify reason for banning <strong className="text-gray-800">{reasonModal.user?.name}</strong>:
            </p>
            <textarea
              rows="3"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Violation of terms, harassment, etc."
              className="w-full mt-3 p-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setReasonModal({ isOpen: false, user: null, targetStatus: false })}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmBan}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};