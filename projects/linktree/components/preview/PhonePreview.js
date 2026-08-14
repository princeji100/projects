'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExternalLinkAlt,
  faRotateRight,
  faCircleCheck,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';
import ProfileAvatar from '@/components/media/ProfileAvatar';
import LinkIcon from '@/components/media/LinkIcon';
import { getTheme } from '@/lib/themes';
import { getSocialButton } from '@/lib/socialButtons';
import { isLinkLive } from '@/lib/linkLifecycle';

/**
 * Live Phone Mockup Preview Component
 * Renders a sticky, responsive smartphone frame with real-time profile synchronization.
 */
export default function PhonePreview({
  page,
  user,
  previewTheme,
  previewBgType,
  previewBgColor,
  previewBgImage,
  previewAvatar,
  previewDisplayName,
  previewBio,
  previewLocation,
  previewLinks,
  previewButtons,
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const uri = page?.uri || 'username';
  const themeKey = previewTheme !== undefined ? previewTheme : page?.theme || 'default';
  const bgType = previewBgType !== undefined ? previewBgType : page?.bgType || 'preset';
  const bgColor = previewBgColor !== undefined ? previewBgColor : page?.bgColor || '#000000';
  const bgImage = previewBgImage !== undefined ? previewBgImage : page?.bgImage || '';
  const avatar = previewAvatar !== undefined ? previewAvatar : page?.avatar || user?.image || '';
  const displayName = previewDisplayName !== undefined && previewDisplayName !== '' 
    ? previewDisplayName 
    : page?.displayName || user?.name || uri;
  const bio = previewBio !== undefined ? previewBio : page?.bio || '';
  const location = previewLocation !== undefined ? previewLocation : page?.location || '';
  const rawLinks = previewLinks !== undefined ? previewLinks : page?.links || [];
  const buttons = previewButtons !== undefined ? previewButtons : page?.buttons || {};

  const isPreset = bgType === 'preset' || !bgType;
  const currentTheme = isPreset ? getTheme(themeKey) : getTheme('default');

  let previewStyle = {};
  let previewBgClass = '';

  if (bgType === 'color' && bgColor) {
    previewStyle = { backgroundColor: bgColor };
  } else if (bgType === 'image' && bgImage) {
    previewStyle = {
      backgroundImage: `url(${bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  } else {
    previewBgClass = currentTheme.pageBg;
  }

  const renderNow = new Date();
  const visibleLinks = (rawLinks || []).filter((l) => isLinkLive(l, renderNow));

  const buttonKeys = Object.keys(buttons || {}).filter((k) => Boolean(buttons[k]));

  return (
    <div className="sticky top-6 self-start w-full space-y-3">
      {/* Header bar above phone */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight">Live Mobile Preview</h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {page?.uri && (
            <Link
              href={`/${page.uri}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-all"
            >
              <span>Open</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label="Refresh preview"
            title="Refresh preview"
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Smartphone Bezel */}
      <div className="relative mx-auto w-[280px] sm:w-[310px] lg:w-[320px] h-[550px] sm:h-[590px] lg:h-[610px] max-h-[calc(100vh-6rem)] bg-slate-950 rounded-[44px] p-3 shadow-2xl ring-1 ring-slate-800 ring-offset-4 ring-offset-slate-100 flex flex-col justify-between select-none">
        {/* Dynamic Island / Speaker */}
        <div className="absolute top-4.5 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full z-30 flex items-center justify-end px-2 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-white/10" />
        </div>

        {/* Screen Inner Viewport with independent scroll */}
        <div
          key={refreshKey}
          style={previewStyle}
          className={`w-full h-full rounded-[34px] overflow-y-auto overflow-x-hidden ${previewBgClass} ${currentTheme.textColor} p-4 pt-10 flex flex-col items-center justify-between no-scrollbar transition-all duration-300 relative`}
        >
          <div className="w-full flex flex-col items-center">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full ring-3 ring-white/30 shadow-lg overflow-hidden shrink-0 mb-3 bg-slate-800">
              <ProfileAvatar src={avatar} name={displayName} size={80} />
            </div>

            {/* Display Name & Verified Badge */}
            <div className="flex items-center gap-1.5 justify-center text-center px-2">
              <h3 className={`text-base font-bold truncate ${currentTheme.headingColor}`}>
                {displayName}
              </h3>
              <FontAwesomeIcon icon={faCircleCheck} className="text-blue-400 text-xs shrink-0" />
            </div>

            {/* Handle / Location */}
            <p className={`text-[11px] ${currentTheme.mutedTextColor} font-medium mt-0.5 truncate max-w-full`}>
              @{uri} {location ? `• ${location}` : ''}
            </p>

            {/* Bio */}
            {bio && (
              <p className={`text-[11px] ${currentTheme.subtitleColor} text-center mt-2 px-2 line-clamp-3 leading-snug break-words`}>
                {bio}
              </p>
            )}

            {/* Social Buttons Row */}
            {buttonKeys.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center my-3">
                {buttonKeys.map((key) => {
                  const btn = getSocialButton(key);
                  return (
                    <div
                      key={key}
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${currentTheme.buttonStyle} shadow-2xs backdrop-blur-xs text-[11px] shrink-0`}
                    >
                      <FontAwesomeIcon icon={btn.icon} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Links Stack */}
            <div className="w-full space-y-2 mt-2">
              {visibleLinks.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/15 rounded-2xl p-4">
                  <p className={`text-[11px] ${currentTheme.mutedTextColor} opacity-70 italic`}>
                    No active links yet. Add a link to see it appear live here!
                  </p>
                </div>
              ) : (
                visibleLinks.map((link, idx) => (
                  <div
                    key={link._id || idx}
                    className={`w-full p-2.5 rounded-xl ${currentTheme.cardBg} ${currentTheme.cardBorder} flex items-center gap-2.5 shadow-2xs backdrop-blur-xs transition-all`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg ${currentTheme.iconBg} flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10`}
                    >
                      <LinkIcon src={link.icon} title={link.title} size={32} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${currentTheme.headingColor}`}>
                        {link.title || 'Untitled Link'}
                      </p>
                      {link.subtitle && (
                        <p className={`text-[10px] truncate ${currentTheme.subtitleColor}`}>
                          {link.subtitle}
                        </p>
                      )}
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className="text-[9px] opacity-40 shrink-0"
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Phone Footer Branding */}
          <div className="pt-4 pb-1 text-center">
            <span className="text-[9px] font-semibold text-white/40 tracking-wider uppercase">
              linktree
            </span>
          </div>
        </div>

        {/* Home Indicator Bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full pointer-events-none" />
      </div>
    </div>
  );
}
