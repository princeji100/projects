'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserShield,
  faPlus,
  faTrash,
  faSearch,
  faSpinner,
  faEnvelope,
  faClock,
  faCheck,
  faTimes,
  faInbox,
  faCheckCircle,
  faXmarkCircle,
  faAt,
  faUserCheck,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  addAllowedUser,
  removeAllowedUser,
  approveInviteRequest,
  rejectInviteRequest,
  deleteInviteRequest,
} from '@/action/AdminAction';
import SectionBox from '@/components/layout/SectionBox';

export default function AdminAllowlistClient({
  initialAllowedUsers = [],
  initialInviteRequests = [],
  adminEmail,
}) {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'users'
  const [emailInput, setEmailInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userList, setUserList] = useState(initialAllowedUsers);
  const [requestList, setRequestList] = useState(initialInviteRequests);
  const [pendingUser, setPendingUser] = useState(null); // User to delete confirmation
  const [isPending, startTransition] = useTransition();

  const pendingRequestsCount = requestList.filter((r) => r.status === 'pending').length;

  const filteredUsers = userList.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const filteredRequests = requestList.filter(
    (r) =>
      r.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      r.handle.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // 1. Manually Add User to Allowlist
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    startTransition(async () => {
      const res = await addAllowedUser(emailInput);
      if (res.success) {
        toast.success(res.message);
        const newEmail = emailInput.toLowerCase().trim();
        if (!userList.some((u) => u.email === newEmail)) {
          setUserList([
            { _id: Date.now().toString(), email: newEmail, createdAt: new Date().toISOString() },
            ...userList,
          ]);
        }
        setEmailInput('');
      } else {
        toast.error(res.error || 'Failed to add email');
      }
    });
  };

  // 2. Remove User from Allowlist
  const handleConfirmRemove = async () => {
    if (!pendingUser) return;
    const targetEmail = pendingUser.email;

    startTransition(async () => {
      const res = await removeAllowedUser(targetEmail);
      if (res.success) {
        toast.success(res.message);
        setUserList(userList.filter((u) => u.email !== targetEmail));
        setPendingUser(null);
      } else {
        toast.error(res.error || 'Failed to remove user');
      }
    });
  };

  // 3. Approve Request
  const handleApprove = async (req) => {
    startTransition(async () => {
      const res = await approveInviteRequest(req._id);
      if (res.success) {
        toast.success(res.message);
        // Update request status locally
        setRequestList((prev) =>
          prev.map((item) => (item._id === req._id ? { ...item, status: 'approved' } : item))
        );
        // Add to allowed list locally
        if (!userList.some((u) => u.email === req.email.toLowerCase())) {
          setUserList((prev) => [
            { _id: Date.now().toString(), email: req.email.toLowerCase(), createdAt: new Date().toISOString() },
            ...prev,
          ]);
        }
      } else {
        toast.error(res.error || 'Failed to approve request');
      }
    });
  };

  // 4. Reject Request
  const handleReject = async (reqId) => {
    startTransition(async () => {
      const res = await rejectInviteRequest(reqId);
      if (res.success) {
        toast.success(res.message);
        setRequestList((prev) =>
          prev.map((item) => (item._id === reqId ? { ...item, status: 'rejected' } : item))
        );
      } else {
        toast.error(res.error || 'Failed to reject request');
      }
    });
  };

  // 5. Delete Request
  const handleDeleteRequest = async (reqId) => {
    startTransition(async () => {
      const res = await deleteInviteRequest(reqId);
      if (res.success) {
        toast.success(res.message);
        setRequestList((prev) => prev.filter((item) => item._id !== reqId));
      } else {
        toast.error(res.error || 'Failed to delete request');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info Box */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0">
            <FontAwesomeIcon icon={faUserShield} />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Admin Control Center</h1>
            <p className="text-sm text-slate-500">
              Manage invite applications and approve creator access
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-500 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200/80 self-start md:self-auto">
          Logged in as Admin: <span className="font-bold text-slate-800">{adminEmail}</span>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FontAwesomeIcon icon={faInbox} />
          <span>Access Requests</span>
          {pendingRequestsCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'requests' ? 'bg-white text-blue-600' : 'bg-amber-500 text-white'
              }`}
            >
              {pendingRequestsCount} new
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'users'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FontAwesomeIcon icon={faUserCheck} />
          <span>Whitelisted Users</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeTab === 'users' ? 'bg-white text-blue-600' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {userList.length}
          </span>
        </button>
      </div>

      {/* ═══ TAB 1: PENDING ACCESS REQUESTS ═══ */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <SectionBox>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Creator Early Access Applications
                </h2>
                <p className="text-xs text-slate-500">
                  Review applicant details and click Approve to instantly whitelist their Google account.
                </p>
              </div>

              {/* Search bar */}
              <div className="relative min-w-[240px]">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
                <input
                  type="text"
                  placeholder="Search by email or handle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium space-y-2">
                <FontAwesomeIcon icon={faInbox} className="text-3xl text-slate-300" />
                <p>No invite requests found.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <div
                    key={req._id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 p-3 rounded-2xl transition"
                  >
                    {/* Left: Email, Handle, Note & Date */}
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{req.email}</span>
                        {req.handle && (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                            <FontAwesomeIcon icon={faAt} className="text-[10px]" />
                            {req.handle}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            req.status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : req.status === 'rejected'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {req.note && (
                        <p className="text-xs text-slate-600 bg-slate-100 p-2 rounded-xl border border-slate-200/60 mt-1 max-w-xl">
                          &ldquo;{req.note}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <FontAwesomeIcon icon={faClock} className="text-[10px]" />
                        <span>
                          Applied: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(req)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={faCheck} />
                            <span>Approve &amp; Whitelist</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(req._id)}
                            disabled={isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer disabled:opacity-50"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 mr-2">
                          <FontAwesomeIcon icon={faCheckCircle} />
                          <span>Approved</span>
                        </span>
                      )}

                      {req.status === 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          <span>Re-Approve</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteRequest(req._id)}
                        disabled={isPending}
                        title="Delete request record"
                        className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* ═══ TAB 2: WHITELISTED USERS ═══ */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Add User Section */}
          <SectionBox>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faEnvelope} className="text-blue-500 text-sm" />
              Directly Add Allowed Google Email
            </h2>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="creator@gmail.com"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isPending || !emailInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
                ) : (
                  <FontAwesomeIcon icon={faPlus} className="text-sm" />
                )}
                <span>Add User</span>
              </button>
            </form>
          </SectionBox>

          {/* List Users Section */}
          <SectionBox>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Active Whitelisted Users</h2>
                <p className="text-xs text-slate-500">
                  {userList.length} accounts currently authorized to sign in
                </p>
              </div>

              {/* Search bar */}
              <div className="relative min-w-[240px]">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
                <input
                  type="text"
                  placeholder="Search whitelisted emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs font-medium">
                No users found.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isOwner = user.email.toLowerCase() === adminEmail.toLowerCase();
                  return (
                    <div
                      key={user._id}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 px-2 rounded-xl transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {user.email}
                            </span>
                            {isOwner && (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-200">
                                Owner / Admin
                              </span>
                            )}
                          </div>
                          {user.createdAt && (
                            <span className="text-[11px] text-slate-400">
                              Added: {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        {isOwner ? (
                          <span className="text-xs text-slate-400 italic pr-2">Protected</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingUser(user)}
                            className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                            title="Revoke access"
                          >
                            <FontAwesomeIcon icon={faTrash} className="text-xs" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* Confirmation Modal for User Removal */}
      {pendingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-900">Revoke Creator Access?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-800">{pendingUser.email}</span> from the allowlist? They will immediately be logged out and unable to sign in.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isPending && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                <span>Yes, Revoke</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
