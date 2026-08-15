'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
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
  faComments,
  faBug,
  faLightbulb,
  faCommentDots,
  faArrowUpRightFromSquare,
  faLink,
  faCircleDot,
  faCrown,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import {
  addAllowedUser,
  removeAllowedUser,
  approveInviteRequest,
  rejectInviteRequest,
  deleteInviteRequest,
  updateFeedbackStatus,
  deleteFeedback,
  grantManualProAction,
  revokeManualProAction,
} from '@/action/AdminAction';
import SectionBox from '@/components/layout/SectionBox';

export default function AdminAllowlistClient({
  initialAllowedUsers = [],
  initialInviteRequests = [],
  initialFeedbacks = [],
  adminEmail,
}) {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'users' | 'feedback'
  const [emailInput, setEmailInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState('all'); // 'all' | 'open' | 'resolved'
  const [userList, setUserList] = useState(initialAllowedUsers);
  const [requestList, setRequestList] = useState(initialInviteRequests);
  const [feedbackList, setFeedbackList] = useState(initialFeedbacks);
  const [pendingUser, setPendingUser] = useState(null); // User to delete confirmation
  const [pendingProGrant, setPendingProGrant] = useState(null); // User to grant Pro
  const [pendingProRevoke, setPendingProRevoke] = useState(null); // User to revoke Pro
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const [isPending, startTransition] = useTransition();

  const pendingRequestsCount = requestList.filter((r) => r.status === 'pending').length;
  const openFeedbackCount = feedbackList.filter((f) => f.status === 'open').length;

  const filteredUsers = userList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.handle && u.handle.toLowerCase().includes(q)) ||
      (u.displayName && u.displayName.toLowerCase().includes(q))
    );
  });

  const filteredRequests = requestList.filter(
    (r) =>
      r.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      r.handle.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const filteredFeedbacks = feedbackList.filter((f) => {
    const matchesSearch =
      f.userEmail.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      f.message.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (f.subject && f.subject.toLowerCase().includes(searchQuery.toLowerCase().trim())) ||
      (f.pageUri && f.pageUri.toLowerCase().includes(searchQuery.toLowerCase().trim()));

    if (feedbackFilter === 'all') return matchesSearch;
    return matchesSearch && f.status === feedbackFilter;
  });

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
            {
              _id: Date.now().toString(),
              email: newEmail,
              handle: null,
              displayName: '',
              linksCount: 0,
              createdAt: new Date().toISOString(),
            },
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
    startTransition(async () => {
      const res = await removeAllowedUser(pendingUser.email);
      if (res.success) {
        toast.success(res.message);
        setUserList((prev) => prev.filter((u) => u.email !== pendingUser.email));
        setPendingUser(null);
      } else {
        toast.error(res.error || 'Failed to remove user');
      }
    });
  };

  // 2b. Grant Manual Pro
  const handleConfirmGrantPro = async () => {
    if (!pendingProGrant?.userId) return;
    startTransition(async () => {
      const res = await grantManualProAction(pendingProGrant.userId);
      if (res.success) {
        toast.success(res.message);
        setUserList((prev) =>
          prev.map((u) => (u.userId === pendingProGrant.userId ? { ...u, planTier: 'manual_pro' } : u))
        );
        setPendingProGrant(null);
      } else {
        toast.error(res.error || 'Failed to grant Pro access');
      }
    });
  };

  // 2c. Revoke Manual Pro
  const handleConfirmRevokePro = async () => {
    if (!pendingProRevoke?.userId) return;
    startTransition(async () => {
      const res = await revokeManualProAction(pendingProRevoke.userId);
      if (res.success) {
        toast.info(res.message);
        setUserList((prev) =>
          prev.map((u) => (u.userId === pendingProRevoke.userId ? { ...u, planTier: 'free' } : u))
        );
        setPendingProRevoke(null);
      } else {
        toast.error(res.error || 'Failed to revoke Pro access');
      }
    });
  };

  // 3. Approve Request
  const handleApproveRequest = async (request) => {
    startTransition(async () => {
      const res = await approveInviteRequest(request._id, request.email);
      if (res.success) {
        toast.success(`Approved and whitelisted ${request.email}!`);
        setRequestList((prev) =>
          prev.map((r) => (r._id === request._id ? { ...r, status: 'approved' } : r))
        );
        if (!userList.some((u) => u.email === request.email.toLowerCase().trim())) {
          setUserList((prev) => [
            {
              _id: Date.now().toString(),
              email: request.email.toLowerCase().trim(),
              handle: request.handle || null,
              displayName: '',
              linksCount: 0,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      } else {
        toast.error(res.error || 'Failed to approve request');
      }
    });
  };

  // 4. Reject Request
  const handleRejectRequest = async (requestId) => {
    startTransition(async () => {
      const res = await rejectInviteRequest(requestId);
      if (res.success) {
        toast.info('Request marked as rejected');
        setRequestList((prev) =>
          prev.map((r) => (r._id === requestId ? { ...r, status: 'rejected' } : r))
        );
      } else {
        toast.error(res.error || 'Failed to reject request');
      }
    });
  };

  // 5. Delete Request
  const handleDeleteRequest = async (requestId) => {
    startTransition(async () => {
      const res = await deleteInviteRequest(requestId);
      if (res.success) {
        toast.success('Request deleted');
        setRequestList((prev) => prev.filter((r) => r._id !== requestId));
      } else {
        toast.error(res.error || 'Failed to delete request');
      }
    });
  };

  // 6. Update Feedback Status
  const handleUpdateFeedbackStatus = async (feedbackId, newStatus) => {
    startTransition(async () => {
      const res = await updateFeedbackStatus(feedbackId, newStatus);
      if (res.success) {
        toast.success(`Feedback status updated to ${newStatus}`);
        setFeedbackList((prev) =>
          prev.map((f) => (f._id === feedbackId ? { ...f, status: newStatus } : f))
        );
      } else {
        toast.error(res.error || 'Failed to update status');
      }
    });
  };

  // 7. Delete Feedback
  const handleDeleteFeedback = async (feedbackId) => {
    startTransition(async () => {
      const res = await deleteFeedback(feedbackId);
      if (res.success) {
        toast.success('Feedback report removed');
        setFeedbackList((prev) => prev.filter((f) => f._id !== feedbackId));
        setPendingFeedback(null);
      } else {
        toast.error(res.error || 'Failed to delete report');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* ═══ Top Header Banner ═══ */}
      <SectionBox className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-mono font-medium border border-blue-400/20">
              <FontAwesomeIcon icon={faUserShield} className="w-3 h-3 text-blue-400" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Platform &amp; Access Governance
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Approve creator access requests, monitor registered usernames, and review user feedback &amp; bug reports.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-2xl backdrop-blur-md border border-white/10 text-xs shrink-0">
            <FontAwesomeIcon icon={faEnvelope} className="w-3.5 h-3.5 text-blue-300" />
            <span className="font-mono text-slate-200">{adminEmail}</span>
          </div>
        </div>
      </SectionBox>

      {/* ═══ Segmented Tab Switcher ═══ */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner max-w-xl">
        <button
          type="button"
          onClick={() => {
            setActiveTab('requests');
            setSearchQuery('');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FontAwesomeIcon icon={faInbox} className="w-3.5 h-3.5 text-xs" />
          <span>Access Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('users');
            setSearchQuery('');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FontAwesomeIcon icon={faUserCheck} className="w-3.5 h-3.5 text-xs" />
          <span>Whitelisted Users</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
            {userList.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('feedback');
            setSearchQuery('');
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'feedback'
              ? 'bg-white text-purple-600 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FontAwesomeIcon icon={faComments} className="w-3.5 h-3.5 text-xs" />
          <span>Bug Reports &amp; Feedback</span>
          {openFeedbackCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">
              {openFeedbackCount}
            </span>
          )}
        </button>
      </div>

      {/* ═══ TAB 1: ACCESS REQUESTS ═══ */}
      {activeTab === 'requests' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <SectionBox>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Creator Invite Applications</h2>
                <p className="text-xs text-slate-500">
                  Review public early access applications and approve them to automatically whitelist their Google accounts.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="w-3 h-3 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email or handle..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-slate-400">
                <FontAwesomeIcon icon={faInbox} className="w-8 h-8 text-2xl text-slate-300" />
                <p className="text-sm font-medium">No invite requests found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRequests.map((req) => (
                  <div
                    key={req._id}
                    className={`p-4 rounded-2xl border transition-all ${
                      req.status === 'pending'
                        ? 'bg-blue-50/40 border-blue-200/80 shadow-xs'
                        : req.status === 'approved'
                        ? 'bg-slate-50 border-emerald-200/80 opacity-80'
                        : 'bg-slate-50 border-slate-200 opacity-60'
                    } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 font-mono">
                          {req.email}
                        </span>
                        {req.handle && (
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-xs font-mono font-semibold">
                            @{req.handle}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            req.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : req.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>

                      {req.note && (
                        <p className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 max-w-2xl">
                          &ldquo;{req.note}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5 text-[10px]" />
                          <span>{req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleApproveRequest(req)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-xs" />
                            <span>Approve &amp; Whitelist</span>
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRejectRequest(req._id)}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faTimes} className="w-3 h-3 text-xs" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleDeleteRequest(req._id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                        title="Delete Record"
                      >
                        <FontAwesomeIcon icon={faTrash} className="w-3 h-3 text-xs" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* ═══ TAB 2: WHITELISTED USERS & USERNAMES ═══ */}
      {activeTab === 'users' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Manual Add Form */}
          <SectionBox>
            <h2 className="text-base font-bold text-slate-900 mb-1">Directly Whitelist a Google Account</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter any Google email to immediately grant them platform access.
            </p>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="w-3 h-3 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="creator@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faPlus} className="w-3 h-3 text-xs" />
                )}
                <span>Add to Whitelist</span>
              </button>
            </form>
          </SectionBox>

          {/* User & Handle List */}
          <SectionBox>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Whitelisted Accounts &amp; Usernames</h2>
                <p className="text-xs text-slate-500">
                  Total approved users and their associated public Prince Links profiles.
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <FontAwesomeIcon
                  icon={faSearch}
                  className="w-3 h-3 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by email, handle, or name..."
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-slate-400">
                <FontAwesomeIcon icon={faUserShield} className="w-8 h-8 text-2xl text-slate-300" />
                <p className="text-sm font-medium">No whitelisted users found matching your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 uppercase tracking-wider font-bold">
                      <th className="py-3 px-4 rounded-l-xl">User Google Account</th>
                      <th className="py-3 px-4">Claimed Username / Handle</th>
                      <th className="py-3 px-4">Published Links</th>
                      <th className="py-3 px-4">SaaS Tier</th>
                      <th className="py-3 px-4">Whitelisted Date</th>
                      <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user) => {
                      const isSelf = user.email.toLowerCase() === adminEmail.toLowerCase();
                      const hasAccount = Boolean(user.userId);
                      const isManualPro = user.planTier === 'manual_pro';
                      const isProviderPro = user.planTier === 'provider_pro';

                      return (
                        <tr key={user._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">{user.email}</span>
                              {isSelf && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Owner &bull; Admin
                                </span>
                              )}
                            </div>
                            {user.displayName && (
                              <p className="text-[11px] text-slate-500 mt-0.5">{user.displayName}</p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {user.handle ? (
                              <Link
                                href={`/${user.handle}`}
                                target="_blank"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono font-bold transition-colors"
                              >
                                <span>@{user.handle}</span>
                                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-2.5 h-2.5 text-[10px]" />
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400 font-medium italic">
                                <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5 text-[10px]" />
                                <span>No handle claimed yet</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                            {user.handle ? (
                              <span className="flex items-center gap-1">
                                <FontAwesomeIcon icon={faLink} className="w-2.5 h-2.5 text-slate-400" />
                                <span>{user.linksCount} active links</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">&mdash;</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {isManualPro ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <FontAwesomeIcon icon={faCrown} className="text-[9px]" />
                                  <span>Pro (Manual)</span>
                                </span>
                              ) : isProviderPro ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  <FontAwesomeIcon icon={faCrown} className="text-[9px]" />
                                  <span>Pro (Provider)</span>
                                </span>
                              ) : hasAccount ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  Free
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-400">
                                  Pending Login
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Active'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {hasAccount && (
                                <>
                                  {isManualPro ? (
                                    <button
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => setPendingProRevoke(user)}
                                      className="px-2.5 py-1 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors font-medium cursor-pointer"
                                    >
                                      Revoke Pro
                                    </button>
                                  ) : isProviderPro ? (
                                    <span className="text-[11px] text-slate-400 italic">
                                      Provider Managed
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => setPendingProGrant(user)}
                                      className="px-2.5 py-1 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors font-semibold cursor-pointer flex items-center gap-1"
                                    >
                                      <FontAwesomeIcon icon={faCrown} className="text-[10px]" />
                                      <span>Grant Pro</span>
                                    </button>
                                  )}
                                </>
                              )}

                              {isSelf ? (
                                <span className="text-[11px] text-slate-400 italic">Protected</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPendingUser(user)}
                                  className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium cursor-pointer"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* ═══ TAB 3: BUG REPORTS & FEEDBACK ═══ */}
      {activeTab === 'feedback' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <SectionBox>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">User Bug Reports &amp; Feedback</h2>
                <p className="text-xs text-slate-500">
                  Review issues, feature requests, and notes submitted by platform creators.
                </p>
              </div>

              {/* Status Filter & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFeedbackFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      feedbackFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    All ({feedbackList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackFilter('open')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      feedbackFilter === 'open' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Open ({openFeedbackCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedbackFilter('resolved')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      feedbackFilter === 'resolved' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Resolved
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search reports..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {filteredFeedbacks.length === 0 ? (
              <div className="text-center py-12 space-y-2 text-slate-400">
                <FontAwesomeIcon icon={faComments} className="w-8 h-8 text-2xl text-slate-300" />
                <p className="text-sm font-medium">No bug reports or feedback found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFeedbacks.map((f) => {
                  const isBug = f.type === 'bug';
                  const isFeature = f.type === 'feature';
                  return (
                    <div
                      key={f._id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        f.status === 'open'
                          ? isBug
                            ? 'bg-rose-50/40 border-rose-200 shadow-xs'
                            : 'bg-amber-50/40 border-amber-200 shadow-xs'
                          : 'bg-slate-50 border-slate-200 opacity-80'
                      } space-y-3`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isBug
                                ? 'bg-rose-100 text-rose-800'
                                : isFeature
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            <FontAwesomeIcon
                              icon={isBug ? faBug : isFeature ? faLightbulb : faCommentDots}
                              className="w-3 h-3 text-[10px]"
                            />
                            <span className="capitalize">{f.type}</span>
                          </span>

                          <span className="font-mono font-bold text-xs text-slate-900">
                            {f.userEmail}
                          </span>

                          {f.pageUri && (
                            <Link
                              href={`/${f.pageUri}`}
                              target="_blank"
                              className="text-[11px] font-mono text-blue-600 hover:underline bg-blue-50 px-2 py-0.5 rounded-md"
                            >
                              @{f.pageUri}
                            </Link>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              f.status === 'open'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {f.status}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono">
                          {f.createdAt ? new Date(f.createdAt).toLocaleString() : 'Recent'}
                        </span>
                      </div>

                      {f.subject && (
                        <h4 className="font-bold text-sm text-slate-900">{f.subject}</h4>
                      )}

                      <p className="text-xs text-slate-700 leading-relaxed bg-white/90 p-3 rounded-xl border border-slate-200/70 whitespace-pre-wrap">
                        {f.message}
                      </p>

                      {/* Status Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          {f.status === 'open' ? (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleUpdateFeedbackStatus(f._id, 'resolved')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-xs" />
                              <span>Mark as Resolved</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleUpdateFeedbackStatus(f._id, 'open')}
                              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FontAwesomeIcon icon={faCircleDot} className="w-3 h-3 text-xs" />
                              <span>Re-open</span>
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDeleteFeedback(f._id)}
                          className="px-2.5 py-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faTrash} className="w-3 h-3 mr-1" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionBox>
        </div>
      )}

      {/* ═══ Confirmation Modal: Remove User ═══ */}
      {pendingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl">
              <FontAwesomeIcon icon={faTrash} className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Remove from Whitelist?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to revoke platform access for{' '}
                <span className="font-bold text-slate-800 font-mono">{pendingUser.email}</span>?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingUser(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmRemove}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-500/20 cursor-pointer"
              >
                {isPending ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Confirmation Modal: Grant Pro ═══ */}
      {pendingProGrant && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto text-xl">
              <FontAwesomeIcon icon={faCrown} className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Grant Pro Access?</h3>
              <p className="text-xs text-slate-500">
                Grant manual Pro entitlements to{' '}
                <span className="font-bold text-slate-800 font-mono">{pendingProGrant.email}</span>?
                This activates all current and upcoming Pro capabilities for testing without payment.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingProGrant(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmGrantPro}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                {isPending ? 'Granting...' : 'Grant Pro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Confirmation Modal: Revoke Pro ═══ */}
      {pendingProRevoke && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl">
              <FontAwesomeIcon icon={faCrown} className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Revoke Pro Access?</h3>
              <p className="text-xs text-slate-500">
                Revoke manual Pro entitlements from{' '}
                <span className="font-bold text-slate-800 font-mono">{pendingProRevoke.email}</span>?
                The account will return to the Free plan. Creator profile and links remain untouched.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingProRevoke(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleConfirmRevokePro}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                {isPending ? 'Revoking...' : 'Revoke Pro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

