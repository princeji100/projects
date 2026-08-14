'use client';

import { useState, useTransition } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faAt,
  faPaperPlane,
  faSpinner,
  faCheckCircle,
  faLock,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import { submitInviteRequest } from '@/action/InviteAction';
import { toast } from 'react-toastify';

export default function RequestInviteForm({ defaultEmail = '', onClose }) {
  const [email, setEmail] = useState(defaultEmail);
  const [handle, setHandle] = useState('');
  const [note, setNote] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    startTransition(async () => {
      const res = await submitInviteRequest({ email, handle, note });
      if (res.success) {
        setIsSuccess(true);
        toast.success(res.message);
      } else {
        toast.error(res.error || 'Failed to submit request');
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="text-center py-6 px-4 space-y-4 animate-in fade-in zoom-in-95">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-inner">
          <FontAwesomeIcon icon={faCheckCircle} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-extrabold text-slate-900">Invite Request Received!</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            We&apos;ve logged your request for <span className="font-bold text-slate-800">{email}</span>. Once approved by the administrator, you can sign in directly with Google.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Back to Sign In
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Your Google Email Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@gmail.com"
            required
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-[11px] text-slate-400">Must be the Google account you will use to sign in.</p>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Desired Profile Handle (Optional)
        </label>
        <div className="relative">
          <FontAwesomeIcon icon={faAt} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="yourname"
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Portfolio or Social Link (Optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. github.com/username or instagram.com/portfolio"
          rows={2}
          className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="pt-2 flex items-center justify-between gap-3">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
          )}
          <span>{isPending ? 'Submitting...' : 'Apply for Early Access'}</span>
        </button>
      </div>
    </form>
  );
}
