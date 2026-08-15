import connectToDatabase from '@/lib/connectToDB';
import Event from '@/models/Event';
import Page from '@/models/Page';
import User from '@/models/User';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import {
  faMapMarkerAlt,
  faChevronRight,
  faCircleCheck,
  faLink as faLinkSolid,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import ProfileAvatar from '@/components/media/ProfileAvatar';
import LinkIcon from '@/components/media/LinkIcon';
import PublicShareButton from '@/components/buttons/PublicShareButton';
import { isLinkLive } from '@/lib/linkLifecycle';
import { getTheme } from '@/lib/themes';
import { getFont } from '@/lib/fonts';
import { getLinkBadge } from '@/lib/linkBadges';
import { validateUpiId } from '@/lib/tipJar';
import { parseMediaUrl } from '@/lib/mediaEmbeds';
import { getSocialButton } from '@/lib/socialButtons';
import { parseDevice, normalizeReferrer } from '@/lib/analyticsParser';
import { getBaseUrl, getCanonicalProfileUrl } from '@/lib/siteUrl';
import { getPageOwnerUserId } from '@/lib/pageOwnerResolver';
import { getSafeUserEntitlements } from '@/lib/featureAccess';
import LinktreeLogo from '@/components/media/LinktreeLogo';
import PublicTipJar from '@/components/tipjar/PublicTipJar';
import YouTubeEmbed from '@/components/media/YouTubeEmbed';
import SpotifyEmbed from '@/components/media/SpotifyEmbed';
import AppleMusicEmbed from '@/components/media/AppleMusicEmbed';
import SoundCloudEmbed from '@/components/media/SoundCloudEmbed';

export async function generateMetadata({ params }) {
  const { uri } = await params;
  await connectToDatabase();
  const page = await Page.findOne({ uri }).lean();

  if (!page) {
    return {
      title: 'Profile Not Found | Linktree',
    };
  }

  const title = `${page.displayName || `@${uri}`} | Linktree`;
  const description = page.bio || `Connect with ${page.displayName || uri} on Linktree. Explore links, portfolio, and social channels.`;
  const canonicalUrl = getCanonicalProfileUrl(page || { uri });

  return {
    title,
    description,
    alternates: canonicalUrl ? { canonical: canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      url: canonicalUrl || undefined,
      images: page.avatar ? [page.avatar] : [],
    },
  };
}

const UserPage = async ({ params }) => {
  const { uri } = await params;

  await connectToDatabase();
  const page = await Page.findOne({ uri });

  if (!page) {
    notFound();
  }

  const headerList = await headers();
  const userAgent = headerList.get('user-agent');
  const referer = headerList.get('referer');
  const device = parseDevice(userAgent);
  const referrer = normalizeReferrer(referer, getBaseUrl());

  await Event.create({ url: uri, page: uri, type: 'view', device, referrer });

  const user = await User.findOne({ email: page.owner });
  const ownerUserId = await getPageOwnerUserId(page);
  const entitlements = await getSafeUserEntitlements(ownerUserId);
  const canRemoveBranding = Boolean(entitlements?.features?.remove_branding);

  const buttonLink = (key, value) => {
    switch (key) {
      case 'mobile':
        return `tel:${value}`;
      case 'email':
        return `mailto:${value}`;
      case 'whatsapp':
        return `https://wa.me/${value.replace(/\D/g, '')}`;
      default:
        return value;
    }
  };

  // Theme, Font & Background resolution
  const isPreset = page.bgType === 'preset' || !page.bgType;
  const currentTheme = isPreset ? getTheme(page.theme) : getTheme('default');
  const currentFont = getFont(page.font);

  let pageStyle = {};
  let pageBgClass = '';

  if (page.bgType === 'gradient') {
    pageStyle = {
      background: `linear-gradient(${page.bgGradientDirection || '180deg'}, ${page.bgGradientFrom || '#3b82f6'}, ${page.bgGradientTo || '#9333ea'})`,
      backgroundAttachment: 'fixed',
    };
  } else if (page.bgType === 'color' && page.bgColor) {
    pageStyle = { backgroundColor: page.bgColor };
  } else if (page.bgType === 'image' && page.bgImage) {
    pageStyle = {
      backgroundImage: `url(${page.bgImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    };
  } else {
    pageBgClass = currentTheme.pageBg;
  }

  const fontStyle = currentFont.fontFamily && currentFont.fontFamily !== 'inherit'
    ? { fontFamily: currentFont.fontFamily }
    : {};

  const renderNow = new Date();
  const liveLinks = (page.links || []).filter((link) => isLinkLive(link, renderNow));

  const resolvedDisplayName = page.displayName || user?.name || uri;
  const resolvedAvatar = page.avatar || user?.image || '';

  const buttonKeys = Object.keys(page.buttons || {}).filter((k) => Boolean(page.buttons[k]));

  // Server-authoritative Tip Jar eligibility check
  let tipJarPayload = null;
  if (page.tipJar?.enabled && page.tipJar.upiId) {
    const upiValidation = validateUpiId(page.tipJar.upiId);
    if (upiValidation.ok && upiValidation.upiId) {
      tipJarPayload = {
        upiId: upiValidation.upiId,
        name: page.tipJar.name || '',
        amount: page.tipJar.amount || '',
        message: page.tipJar.message || '',
      };
    }
  }

  const textColor = page.textColor || '';
  const customHeadingStyle = textColor ? { color: textColor } : {};
  const customSubtextStyle = textColor ? { color: textColor, opacity: 0.9 } : {};
  const isLightText = textColor ? textColor.toLowerCase() === '#ffffff' : currentTheme.id !== 'minimal-light';

  return (
    <div
      style={{ ...pageStyle, ...fontStyle }}
      className={`min-h-screen ${pageBgClass} ${textColor ? '' : currentTheme.textColor} ${currentFont.className} transition-colors duration-300 flex flex-col justify-between relative selection:bg-blue-500 selection:text-white`}
    >
      {/* Background Contrast Overlay for custom images */}
      {page.bgType === 'image' && (page.bgImageOverlay ?? true) && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[0.5px] pointer-events-none z-0" />
      )}

      {/* Floating Top Header Bar */}
      <header className="relative z-20 w-full max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex items-center justify-between">
        {!canRemoveBranding ? (
          <Link 
            href="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md transition-all hover:scale-105 active:scale-95 shadow-xs ${
              isLightText
                ? 'bg-black/25 hover:bg-black/40 text-white border border-white/15'
                : 'bg-white/70 hover:bg-white text-slate-900 border border-slate-200/80 shadow-xs'
            }`}
          >
            <FontAwesomeIcon icon={faLinkSolid} className="text-blue-500 text-xs" />
            <span className="font-extrabold text-xs tracking-tight">linktree</span>
          </Link>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <PublicShareButton 
            url={getCanonicalProfileUrl(page || { uri }) || undefined} 
            title={resolvedDisplayName} 
            isDark={isLightText}
          />
        </div>
      </header>

      {/* Main Profile Container */}
      <main className="relative z-10 max-w-xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col items-center">
        {/* Avatar Section with Floating Aura */}
        <div className="relative mb-5 group">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-white/40 via-white/10 to-white/40 backdrop-blur-md shadow-2xl shadow-black/30 overflow-hidden shrink-0 transition-transform duration-300 group-hover:scale-105">
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-900">
              <ProfileAvatar
                src={resolvedAvatar}
                name={resolvedDisplayName}
                size={128}
              />
            </div>
          </div>
        </div>

        {/* Name and Verified Badge */}
        <div className="flex items-center justify-center gap-2 text-center px-2">
          <h1
            style={customHeadingStyle}
            className={`text-2xl sm:text-3xl font-extrabold ${textColor ? '' : currentTheme.headingColor} tracking-tight break-words drop-shadow-sm`}
          >
            {resolvedDisplayName}
          </h1>
          <FontAwesomeIcon icon={faCircleCheck} className="text-blue-400 text-lg shrink-0 drop-shadow-xs" title="Verified Creator" />
        </div>

        {/* Handle / Location Capsule Badge */}
        <div className="mt-1.5 flex items-center justify-center">
          <span
            style={customSubtextStyle}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-2xs ${
              isLightText
                ? 'bg-black/20 text-white/90 border border-white/10'
                : 'bg-white/60 text-slate-700 border border-slate-200/70'
            }`}
          >
            <span>@{uri}</span>
            {page.location && (
              <>
                <span className="opacity-40">&bull;</span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[10px] text-red-400 opacity-90" />
                  <span>{page.location}</span>
                </span>
              </>
            )}
          </span>
        </div>

        {/* Bio */}
        {page.bio && (
          <div className="max-w-md mx-auto text-center mt-3.5 mb-6 px-4">
            <p
              style={customSubtextStyle}
              className={`${textColor ? '' : currentTheme.mutedTextColor} leading-relaxed text-xs sm:text-sm break-words drop-shadow-2xs`}
            >
              {page.bio}
            </p>
          </div>
        )}

        {/* Social Buttons */}
        {buttonKeys.length > 0 && (
          <div className="flex flex-wrap gap-3 sm:gap-3.5 justify-center my-3 mb-8">
            {buttonKeys.map((buttonKey) => {
              const btn = getSocialButton(buttonKey);
              return (
                <Link
                  key={buttonKey}
                  href={buttonLink(buttonKey, page.buttons[buttonKey])}
                  aria-label={`Open ${btn.label || buttonKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: btn.color || '#64748b' }}
                  className="rounded-full flex items-center justify-center text-white
                           shadow-md hover:shadow-xl transition-all duration-200 w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] hover:scale-115 hover:-translate-y-0.5 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none hover:brightness-110"
                >
                  <FontAwesomeIcon
                    className="h-4 w-4 sm:h-5 sm:w-5"
                    icon={btn.icon}
                  />
                </Link>
              );
            })}
          </div>
        )}

        {/* Tip Jar Component (Server-Authoritative Eligibility) */}
        {tipJarPayload && (
          <PublicTipJar tipJar={tipJarPayload} isLightText={isLightText} />
        )}

        {/* Links Stack - Server-authoritative lifecycle filtering (LINK-01..LINK-04) */}
        <div className="w-full space-y-3.5 max-w-xl mx-auto">
          {liveLinks.map((link, index) => {
            const linkKey = link._id?.toString() || link.id?.toString() || `${link.url}-${index}`;
            const media = parseMediaUrl(link.url);

            // YouTube Media Embed Card (Wave 9)
            if (media?.provider === 'youtube') {
              return (
                <YouTubeEmbed
                  key={linkKey}
                  link={link}
                  media={media}
                  uri={page.uri}
                  currentTheme={currentTheme}
                  isLightText={isLightText}
                />
              );
            }

            // Spotify Media Embed Card (Wave 10)
            if (media?.provider === 'spotify') {
              return (
                <SpotifyEmbed
                  key={linkKey}
                  link={link}
                  media={media}
                  uri={page.uri}
                  currentTheme={currentTheme}
                  isLightText={isLightText}
                />
              );
            }

            // Apple Music Media Embed Card (Wave 11)
            if (media?.provider === 'apple-music') {
              return (
                <AppleMusicEmbed
                  key={linkKey}
                  link={link}
                  media={media}
                  uri={page.uri}
                  currentTheme={currentTheme}
                  isLightText={isLightText}
                />
              );
            }

            // SoundCloud Media Embed Card (Wave 12)
            if (media?.provider === 'soundcloud') {
              return (
                <SoundCloudEmbed
                  key={linkKey}
                  link={link}
                  media={media}
                  uri={page.uri}
                  currentTheme={currentTheme}
                  isLightText={isLightText}
                />
              );
            }

            return (
              <Link
                key={linkKey}
                href={link.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                ping={`${process.env.NEXT_PUBLIC_URL || ''}api/click?url=${btoa(link.url || '')}&page=${page.uri}`}
                className={`group relative ${
                  isLightText
                    ? 'bg-white/15 hover:bg-white/25 border-white/20 hover:border-white/40 text-white shadow-lg shadow-black/10'
                    : 'bg-white/90 hover:bg-white border-slate-200/90 hover:border-slate-300 text-slate-900 shadow-md shadow-slate-200/50'
                } border rounded-2xl flex items-center p-3.5 sm:p-4 gap-3.5 sm:gap-4 
                         transition-all duration-200 backdrop-blur-md hover:scale-[1.02] hover:shadow-2xl active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[64px] w-full cursor-pointer`}
              >
                <div className={`${currentTheme.iconBg} w-11 h-11 sm:w-12 sm:h-12 rounded-xl 
                              flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/20 shadow-inner`}>
                  <LinkIcon
                    src={link.icon}
                    title={link.title || 'Untitled Link'}
                    size={48}
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3
                      className={`font-bold text-sm sm:text-base truncate ${
                        isLightText ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {link.title || 'Untitled Link'}
                    </h3>
                    {link.badge && link.badge !== 'none' && (() => {
                      const b = getLinkBadge(link.badge);
                      if (b.id === 'none') return null;
                      return (
                        <span
                          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider ${b.badgeClass}`}
                        >
                          {b.emoji && <span aria-hidden="true">{b.emoji}</span>}
                          <span>{b.displayText}</span>
                        </span>
                      );
                    })()}
                  </div>
                  {link.subtitle && (
                    <p
                      className={`text-xs truncate mt-0.5 ${
                        isLightText ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {link.subtitle}
                    </p>
                  )}
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className={`text-xs ${
                    isLightText ? 'text-white/50' : 'text-slate-400'
                  } group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0 ml-1`}
                />
              </Link>
            );
          })}

          {liveLinks.length === 0 && (
            <div className={`p-8 rounded-2xl text-center border backdrop-blur-md ${
              isLightText ? 'bg-white/10 border-white/10 text-white/70' : 'bg-white/60 border-slate-200 text-slate-500'
            }`}>
              <p className="text-xs font-medium">No active links published yet.</p>
            </div>
          )}
        </div>
      </main>

      {/* Made with Linktree Footer */}
      {!canRemoveBranding && (
        <footer className="relative z-10 text-center py-6 pb-8">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold backdrop-blur-md transition-all shadow-xs hover:scale-105 active:scale-95 ${
              isLightText
                ? 'bg-black/30 hover:bg-black/50 border-white/15 text-white/90 shadow-black/20'
                : 'bg-white/80 hover:bg-white border-slate-300 text-slate-800 shadow-slate-200'
            }`}
          >
            <FontAwesomeIcon icon={faLinkSolid} className="text-blue-500 text-[11px]" />
            <span>Made with Linktree</span>
          </Link>
        </footer>
      )}
    </div>
  );
};

export default UserPage;