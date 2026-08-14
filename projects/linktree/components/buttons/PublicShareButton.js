'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes, faCheck } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

/**
 * Public profile Share button with theme contrast support and clipboard copy fallback.
 */
export default function PublicShareButton({ url, title, isDark = true }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title || 'Linktree Profile',
          url: url || window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard below
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url || window.location.href);
        setCopied(true);
        toast.success('Profile URL copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('Failed to copy profile URL');
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share profile"
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md transition-all shadow-xs active:scale-95 cursor-pointer border ${
        isDark
          ? 'bg-white/15 hover:bg-white/25 border-white/20 text-white focus-visible:ring-white/40'
          : 'bg-slate-200/80 hover:bg-slate-300 border-slate-300 text-slate-800 focus-visible:ring-slate-400'
      } focus-visible:ring-2 focus-visible:outline-none`}
    >
      <FontAwesomeIcon icon={copied ? faCheck : faShareNodes} className="text-xs" />
      <span>{copied ? 'Copied' : 'Share'}</span>
    </button>
  );
}
