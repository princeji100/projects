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
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { addAllowedUser, removeAllowedUser } from '@/action/AdminAction';
import SectionBox from '@/components/layout/SectionBox';

export default function AdminAllowlistClient({ initialAllowedUsers = [], adminEmail }) {
  const [emailInput, setEmailInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userList, setUserList] = useState(initialAllowedUsers);
  const [pendingUser, setPendingUser] = useState(null); // User to delete (for confirmation modal)
  const [isPending, startTransition] = useTransition();

  const filteredUsers = userList.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    startTransition(async () => {
      const res = await addAllowedUser(emailInput);
      if (res.success) {
        toast.success(res.message);
        const newEmail = emailInput.toLowerCase().trim();
        // Optimistically update list if not already present
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

  return (
    <div className="space-y-6">
      {/* Header Info Box */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FontAwesomeIcon icon={faUserShield} className="text-xl" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Admin Allowlist</h1>
              <p className="text-sm text-slate-500">
                Manage who has invite-only access to sign in to Linktree
              </p>
            </div>
          </div>
        </div>
        <div className="text-xs text-slate-400 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 self-start md:self-auto">
          Logged in as Admin: <span className="font-semibold text-slate-700">{adminEmail}</span>
        </div>
      </div>

      {/* Add User Section */}
      <SectionBox>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FontAwesomeIcon icon={faEnvelope} className="text-blue-500 text-sm" />
          Add Allowed Email
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. user@example.com"
              required
              disabled={isPending}
              className="w-full pl-4 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-slate-50/50"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || !emailInput.trim()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition duration-150 disabled:opacity-50 text-sm cursor-pointer shadow-sm shadow-blue-500/20"
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

      {/* Allowlist Table Section */}
      <SectionBox>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Allowed Users ({userList.length})
            </h2>
            <p className="text-xs text-slate-500">Users authorized to authenticate via Google</p>
          </div>
          {userList.length > 0 && (
            <div className="relative w-full sm:w-64">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search allowlist..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
              />
            </div>
          )}
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <FontAwesomeIcon icon={faEnvelope} className="text-lg" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">
              {searchQuery ? 'No matching emails found' : 'No users allowed yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? 'Try a different search query.'
                : 'Add an email below to grant access.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Email Address</th>
                  <th className="pb-3 px-3 hidden sm:table-cell">Added On</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((item) => {
                  const isCurrentAdmin = item.email.toLowerCase() === adminEmail?.toLowerCase();
                  return (
                    <tr key={item._id || item.email} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-800">{item.email}</span>
                          {isCurrentAdmin && (
                            <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-xs text-slate-500 hidden sm:table-cell">
                        <span className="flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faClock} className="text-slate-300 text-[10px]" />
                          {item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Pre-seeded'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingUser(item)}
                          disabled={isPending || isCurrentAdmin}
                          title={isCurrentAdmin ? 'Cannot remove the primary admin' : 'Revoke access'}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 p-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                          <span className="hidden md:inline">Remove</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionBox>

      {/* Confirmation Modal */}
      {pendingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Revoke Access</h3>
            <p className="text-sm text-slate-600 mb-4">
              Are you sure you want to revoke access for{' '}
              <span className="font-semibold text-slate-800">{pendingUser.email}</span>?
              <br />
              <span className="text-xs text-red-500 mt-2 block font-medium">
                Session will be terminated immediately. User data (pages & uploads) will be preserved.
              </span>
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setPendingUser(null)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemove}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition cursor-pointer disabled:opacity-50 shadow-sm shadow-red-500/20"
              >
                {isPending && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                <span>Revoke Access</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
