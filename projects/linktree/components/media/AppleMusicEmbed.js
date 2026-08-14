'use client';

import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlay,
  faXmark,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { faApple } from '@fortawesome/free-brands-svg-icons';
import LinkIcon from './LinkIcon';
import { getLinkBadge } from '@/lib/linkBadges';
import { buildAppleMusicEmbedUrl } from '@/lib/mediaEmbeds';

/**
 * Returns canonical static player height depending on Apple Music resource kind.
 *
 * @param {string} kind
 * @returns {number}
 */
function getAppleMusicEmbedHeight(kind) {
  switch (kind) {
    case 'song':
      return 175;
    case 'album':
    case 'playlist':
    default:
      return 450;
  }
}

export default function AppleMusicEmbed({
  link,
  media,
  uri,
  currentTheme,
  isLightText = false,
}) {
  const [isPlayerMounted, setIsPlayerMounted] = useState(false);
  const hasTrackedClick = useRef(false);

  if (!link || !media || media.provider !== 'apple-music' || !media.id) {
    return null;
  }

  const embedSrc = buildAppleMusicEmbedUrl(media);
  if (!embedSrc) {
    return null;
  }

  const badgeMeta = getLinkBadge(link.badge);

  const trackClickOnce = () => {
    if (hasTrackedClick.current) return;
    hasTrackedClick.current = true;
    try {
      if (typeof window !== 'undefined' && link.url && uri) {
        const pingUrl = `/api/click?url=${btoa(link.url)}&page=${encodeURIComponent(uri)}`;
        if (navigator?.sendBeacon) {
          navigator.sendBeacon(pingUrl);
        } else {
          fetch(pingUrl, { method: 'POST' }).catch(() => {});
        }
      }
    } catch {
      // Fallback silent error handling
    }
  };

  const handlePlayClick = () => {
    trackClickOnce();
    setIsPlayerMounted(true);
  };

  const handleClosePlayer = (e) => {
    e.stopPropagation();
    setIsPlayerMounted(false);
  };

  const titleText = link.title || 'Apple Music';
  const kindLabel = media.kind ? media.kind.charAt(0).toUpperCase() + media.kind.slice(1) : 'Music';
  const subtitleText = link.subtitle || `Apple Music ${kindLabel}`;
  const embedHeight = getAppleMusicEmbedHeight(media.kind);

  return (
    <div
      className={`group relative ${
        isLightText
          ? 'bg-white/15 hover:bg-white/20 border-white/20 hover:border-white/30 text-white shadow-lg shadow-black/10'
          : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-md shadow-slate-200/50'
      } border rounded-2xl p-3.5 sm:p-4 transition-all duration-200 backdrop-blur-md min-h-[64px] w-full flex flex-col justify-center`}
    >
      {/* Top Header Row: Icon, Title/Subtitle, Badge, Actions */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Left Side: Icon & Title info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Custom Link Icon or Apple Music Branded Icon */}
          <div
            className={`${currentTheme?.iconBg || 'bg-[#fc3c44]'} w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/20 shadow-inner`}
          >
            {link.icon ? (
              <LinkIcon src={link.icon} title={titleText} />
            ) : (
              <FontAwesomeIcon icon={faApple} className="text-xl sm:text-2xl text-white" />
            )}
          </div>

          {/* Title and Subtitle */}
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm sm:text-base leading-tight truncate">
                {titleText}
              </h3>
              {badgeMeta?.badgeClass && (
                <span
                  className={`inline-flex items-center text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-2xs ${badgeMeta.pillClass}`}
                >
                  {badgeMeta.label}
                </span>
              )}
            </div>
            {subtitleText && (
              <p
                className={`text-xs mt-0.5 truncate ${
                  isLightText ? 'text-white/75' : 'text-slate-500'
                }`}
              >
                {subtitleText}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Listen / Collapse Action & Escape Hatch */}
        <div className="flex items-center gap-2 shrink-0">
          {!isPlayerMounted ? (
            <button
              type="button"
              onClick={handlePlayClick}
              aria-label={`Open Apple Music player for ${titleText}`}
              className="px-3.5 py-2 rounded-xl bg-[#fc3c44] hover:bg-[#e0343c] active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-[#fc3c44] focus-visible:outline-none"
            >
              <FontAwesomeIcon icon={faPlay} className="text-[11px]" />
              <span className="hidden sm:inline">Listen</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClosePlayer}
              aria-label={`Close ${titleText} player`}
              className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 dark:bg-white/20 dark:hover:bg-white/30 dark:text-white text-xs font-bold transition flex items-center justify-center min-w-[36px] min-h-[36px] cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>
          )}

          {/* Normal Link Escape Hatch */}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackClickOnce}
            aria-label={`Open ${titleText} in Apple Music`}
            title="Open in Apple Music"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition flex items-center justify-center min-w-[36px] min-h-[36px] cursor-pointer"
          >
            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
          </a>
        </div>
      </div>

      {/* Lazy Mounted Responsive Apple Music Iframe Player */}
      {isPlayerMounted && (
        <div className="w-full mt-3.5 pt-3 border-t border-white/10 dark:border-slate-700/50">
          <div
            className="relative w-full rounded-xl overflow-hidden bg-black/90 shadow-inner"
            style={{ height: `${embedHeight}px` }}
          >
            <iframe
              src={embedSrc}
              title={titleText}
              allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
              loading="lazy"
              className="w-full h-full border-0 rounded-xl"
            />
          </div>
          <div className="flex items-center justify-between pt-2 px-1 text-[11px] opacity-75">
            <span>Apple Music Player</span>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={trackClickOnce}
              className="underline hover:opacity-100 flex items-center gap-1 font-medium"
            >
              <span>Open in Apple Music</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[9px]" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
