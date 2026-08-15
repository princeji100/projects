'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateRight,
  faExternalLinkAlt,
  faChevronRight,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import ProfileAvatar from '@/components/media/ProfileAvatar';
import LinkIcon from '@/components/media/LinkIcon';
import { getTheme } from '@/lib/themes';
import { getFont } from '@/lib/fonts';
import { getLinkBadge } from '@/lib/linkBadges';
import { getSocialButton } from '@/lib/socialButtons';
import { isLinkLive } from '@/lib/linkLifecycle';

export default function PhonePreview({
  page,
  user,
  previewTheme,
  previewFont,
  previewTipJar,
  previewBgType,
  previewBgColor,
  previewBgGradientFrom,
  previewBgGradientTo,
  previewBgGradientDirection,
  previewBgImage,
  previewBgImageOverlay,
  previewTextColor,
  previewAvatar,
  displayName: _displayName,
  previewDisplayName,
  previewBio,
  previewLocation,
  previewLinks,
  previewButtons,
  hideBranding = false,
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  const uri = page?.uri || 'username';
  const themeKey = previewTheme !== undefined ? previewTheme : page?.theme || 'default';
  const fontKey = previewFont !== undefined ? previewFont : page?.font || 'default';
  const currentFont = getFont(fontKey);
  const tipJar = previewTipJar !== undefined ? previewTipJar : page?.tipJar;
  const bgType = previewBgType !== undefined ? previewBgType : page?.bgType || 'preset';
  const bgColor = previewBgColor !== undefined ? previewBgColor : page?.bgColor || '#000000';
  const bgGradientFrom = previewBgGradientFrom !== undefined ? previewBgGradientFrom : page?.bgGradientFrom || '#3b82f6';
  const bgGradientTo = previewBgGradientTo !== undefined ? previewBgGradientTo : page?.bgGradientTo || '#9333ea';
  const bgGradientDirection = previewBgGradientDirection !== undefined ? previewBgGradientDirection : page?.bgGradientDirection || '180deg';
  const bgImage = previewBgImage !== undefined ? previewBgImage : page?.bgImage || '';
  const bgImageOverlay = previewBgImageOverlay !== undefined ? previewBgImageOverlay : page?.bgImageOverlay ?? true;
  const textColor = previewTextColor !== undefined ? previewTextColor : page?.textColor || '';
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

  if (bgType === 'gradient') {
    previewStyle = {
      background: `linear-gradient(${bgGradientDirection}, ${bgGradientFrom}, ${bgGradientTo})`,
    };
  } else if (bgType === 'color' && bgColor) {
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

  // Extract active button keys - show immediately when added or edited
  const buttonKeys = Object.keys(buttons || {}).filter((k) => buttons[k] !== undefined && buttons[k] !== null);

  const customHeadingStyle = textColor ? { color: textColor } : {};
  const customSubtextStyle = textColor ? { color: textColor, opacity: 0.8 } : {};
  const isLightText = textColor ? textColor.toLowerCase() === '#ffffff' : currentTheme.id !== 'minimal-light';

  return (
    <div className="sticky top-20 w-full space-y-3">
      {/* Live Preview Header Controls */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-800 tracking-tight">Live Preview</h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Sync
          </span>
        </div>
        <div className="flex items-center gap-2">
          {page?.uri ? (
            <Link
              href={`/${page.uri}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs transition-all active:scale-95"
            >
              <span>View Link</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title="Claim a username first to view live page"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-lg border border-slate-200 shadow-2xs cursor-not-allowed"
            >
              <span>View Link</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setRefreshKey((k) => k + 1)}
            aria-label="Refresh preview"
            title="Refresh preview"
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 shadow-2xs transition-all cursor-pointer active:scale-90"
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
          </button>
        </div>
      </div>

      {/* Realistic Smartphone Frame matching profile-settings.png */}
      <div className="relative mx-auto w-[290px] sm:w-[320px] lg:w-[330px] h-[580px] sm:h-[620px] max-h-[calc(100vh-6rem)] bg-slate-950 rounded-[46px] p-3.5 shadow-2xl ring-1 ring-slate-800 ring-offset-4 ring-offset-slate-100 flex flex-col justify-between select-none">
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-24 h-4.5 bg-black rounded-full z-30 flex items-center justify-end px-2 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 ring-1 ring-white/10" />
        </div>

        {/* Screen Inner Viewport with independent scroll */}
        <div
          key={refreshKey}
          style={{
            ...previewStyle,
            fontFamily: currentFont.fontFamily && currentFont.fontFamily !== 'inherit' ? currentFont.fontFamily : undefined,
          }}
          className={`w-full h-full rounded-[36px] overflow-y-auto overflow-x-hidden ${previewBgClass} ${textColor ? '' : currentTheme.textColor} ${currentFont.className} p-4 pt-11 flex flex-col items-center justify-between no-scrollbar transition-all duration-300 relative`}
        >
          {/* Background Contrast Overlay for custom images */}
          {bgType === 'image' && bgImageOverlay && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px] pointer-events-none rounded-[36px] z-0" />
          )}

          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Avatar with glowing ring */}
            <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full ring-3 ring-white/40 shadow-xl overflow-hidden shrink-0 mb-3 bg-slate-800">
              <ProfileAvatar src={avatar} name={displayName} size={88} />
            </div>

            {/* Display Name & Verified Checkmark Badge */}
            <div className="flex items-center gap-1.5 justify-center text-center px-2">
              <h3
                style={customHeadingStyle}
                className={`text-base sm:text-lg font-extrabold truncate ${textColor ? '' : currentTheme.headingColor} tracking-tight`}
              >
                {displayName}
              </h3>
              <FontAwesomeIcon icon={faCircleCheck} className="text-blue-400 text-xs shrink-0" />
            </div>

            {/* Handle / Location */}
            <p
              style={customSubtextStyle}
              className={`text-[11px] ${textColor ? '' : currentTheme.mutedTextColor} font-medium mt-0.5 truncate max-w-full`}
            >
              @{uri} {location ? `• ${location}` : ''}
            </p>

            {/* Bio */}
            {bio && (
              <p
                style={customSubtextStyle}
                className={`text-[11px] ${textColor ? '' : currentTheme.subtitleColor} text-center mt-2 px-2 line-clamp-3 leading-snug break-words`}
              >
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
                      style={{ backgroundColor: btn.color || '#64748b' }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm text-[11px] shrink-0"
                    >
                      <FontAwesomeIcon icon={btn.icon} />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tip Jar Preview CTA */}
            {tipJar?.enabled && (
              <div
                className={`w-full mb-3 p-2.5 rounded-2xl flex items-center justify-between gap-2 transition-all ${
                  isLightText
                    ? 'bg-white/20 border border-white/30 text-white backdrop-blur-md shadow-xs'
                    : 'bg-emerald-50 text-emerald-950 border border-emerald-200/80 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xs shrink-0 shadow-2xs font-bold">
                    ₹
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">
                      {tipJar.name ? `Tip ${tipJar.name}` : 'Support / Tip'}
                    </p>
                    <p className="text-[9px] opacity-75 truncate">
                      {tipJar.amount ? `Suggested: ₹${tipJar.amount}` : 'Via UPI App / QR'}
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-600/20 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">
                  Tip
                </span>
              </div>
            )}

            {/* Links Stack */}
            <div className="w-full space-y-2.5 mt-2">
              {visibleLinks.length === 0 ? (
                <div
                  className={`text-center py-8 border border-dashed rounded-2xl p-4 ${
                    isLightText ? 'border-white/20' : 'border-slate-300'
                  }`}
                >
                  <p
                    style={customSubtextStyle}
                    className={`text-[11px] ${textColor ? '' : currentTheme.mutedTextColor} opacity-80`}
                  >
                    No active links yet. Add a link to see it appear here!
                  </p>
                </div>
              ) : (
                visibleLinks.map((link, idx) => (
                  <div
                    key={link._id || idx}
                    className={`w-full p-3 rounded-2xl ${
                      isLightText
                        ? 'bg-white/15 border border-white/25 shadow-xs backdrop-blur-md text-white'
                        : 'bg-white/90 text-slate-900 border border-slate-200/90 shadow-xs'
                    } flex items-center gap-3 transition-all duration-200`}
                  >
                    {link.icon && (
                      <div
                        className={`w-8 h-8 rounded-lg ${currentTheme.iconBg} flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-white/10`}
                      >
                        <LinkIcon src={link.icon} title={link.title} size={32} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${
                            isLightText ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {link.title || 'Untitled Link'}
                        </p>
                        {link.badge && link.badge !== 'none' && (() => {
                          const b = getLinkBadge(link.badge);
                          if (b.id === 'none') return null;
                          return (
                            <span
                              className={`shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${b.badgeClass}`}
                            >
                              {b.emoji && <span aria-hidden="true">{b.emoji}</span>}
                              <span>{b.displayText}</span>
                            </span>
                          );
                        })()}
                      </div>
                      {link.subtitle && (
                        <p
                          className={`text-[10px] truncate ${
                            isLightText ? 'text-white/75' : 'text-slate-500'
                          }`}
                        >
                          {link.subtitle}
                        </p>
                      )}
                    </div>
                    <FontAwesomeIcon
                      icon={faChevronRight}
                      className={`text-[9px] ${isLightText ? 'text-white/40' : 'text-slate-400'} shrink-0`}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Phone Footer Branding */}
          {!hideBranding && (
            <div className="relative z-10 pt-4 pb-1 text-center">
              <span
                style={customSubtextStyle}
                className={`text-[9px] font-semibold tracking-wider uppercase ${
                  isLightText ? 'text-white/40' : 'text-slate-400'
                }`}
              >
                Prince Links
              </span>
            </div>
          )}
        </div>

        {/* Home Indicator Bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full pointer-events-none z-30" />
      </div>
    </div>
  );
}
