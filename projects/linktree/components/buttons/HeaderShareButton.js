'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareNodes, faCheck } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';

export default function HeaderShareButton({ uri, publicUrl, size = 'md' }) {
  const [copied, setCopied] = useState(false);

  const isSavedProfile = Boolean(uri);

  const handleShare = async () => {
    if (!isSavedProfile) {
      toast.info('Please claim and save a username to share your profile');
      return;
    }

    // Determine target URL
    const targetUrl = publicUrl || (typeof window !== 'undefined' ? `${window.location.origin}/${uri}` : `/${uri}`);

    // Try Web Share API first if supported
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `@${uri} on Linktree`,
          text: `Check out my links on Linktree:`,
          url: targetUrl,
        });
        return;
      } catch (err) {
        // If user cancelled or share failed, fallback to clipboard copy below
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback to Clipboard Copy
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        toast.success('Profile link copied to clipboard!');
        setTimeout(() => setCopied(false), 2500);
      } catch {
        toast.error('Failed to copy link to clipboard');
      }
    }
  };

  if (!isSavedProfile) {
    return (
      <button
        type="button"
        disabled
        title="Claim a username to share"
        className={`inline-flex items-center gap-1.5 ${
          size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
        } bg-slate-200 text-slate-400 font-semibold rounded-full shadow-xs cursor-not-allowed`}
      >
        <FontAwesomeIcon icon={faShareNodes} className={size === 'sm' ? 'text-[10px]' : 'text-xs'} />
        <span>Share</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share profile link"
      className={`inline-flex items-center gap-1.5 ${
        size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
      } bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-semibold rounded-full transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer`}
    >
      <FontAwesomeIcon
        icon={copied ? faCheck : faShareNodes}
        className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} ${copied ? 'text-emerald-400' : ''}`}
      />
      <span>{copied ? 'Copied!' : 'Share'}</span>
    </button>
  );
}
