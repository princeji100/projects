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
import { getSocialButton } from '@/lib/socialButtons';
import { parseDevice, normalizeReferrer } from '@/lib/analyticsParser';
import { getBaseUrl } from '@/lib/siteUrl';

const UserPage = async ({ params }) => {
  // FIX-06: Next.js 15 requires awaiting dynamic route params
  const { uri } = await params;

  await connectToDatabase();
  const page = await Page.findOne({ uri });

  // FIX-03: Unknown /username renders 404 page
  if (!page) {
    notFound();
  }

  // FIX-04 & ANA-01: Event creation is gated strictly behind page existence with normalized metadata
  const headerList = await headers();
  const userAgent = headerList.get('user-agent');
  const referer = headerList.get('referer');
  const device = parseDevice(userAgent);
  const referrer = normalizeReferrer(referer, getBaseUrl());

  await Event.create({ url: uri, page: uri, type: 'view', device, referrer });

  const user = await User.findOne({ email: page.owner });

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

  // Theme & Background resolution
  const isPreset = page.bgType === 'preset' || !page.bgType;
  const currentTheme = isPreset ? getTheme(page.theme) : getTheme('default');

  let pageStyle = {};
  let pageBgClass = '';

  if (page.bgType === 'color' && page.bgColor) {
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

  const renderNow = new Date();
  const liveLinks = (page.links || []).filter((link) => isLinkLive(link, renderNow));

  const resolvedDisplayName = page.displayName || user?.name || uri;
  const resolvedAvatar = page.avatar || user?.image || '';

  const buttonKeys = Object.keys(page.buttons || {}).filter((k) => Boolean(page.buttons[k]));

  const isDarkTheme = currentTheme.id !== 'minimal-light';

  return (
    <div
      style={pageStyle}
      className={`min-h-screen ${pageBgClass} ${currentTheme.textColor} transition-colors duration-300 flex flex-col justify-between`}
    >
      {/* Top Navbar */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between z-20">
        <Link 
          href="/"
          className={`flex items-center gap-1.5 font-bold text-lg tracking-tight focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 transition-opacity hover:opacity-80 ${
            isDarkTheme ? 'text-white' : 'text-slate-900'
          }`}
        >
          <FontAwesomeIcon icon={faLinkSolid} className="text-sm text-blue-500" />
          <span>linktree</span>
        </Link>
        <PublicShareButton 
          url={typeof window !== 'undefined' ? window.location.href : undefined} 
          title={resolvedDisplayName} 
          isDark={isDarkTheme}
        />
      </header>

      {/* Main Profile Container */}
      <main className="max-w-2xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col items-center">
        {/* Avatar Section */}
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-white/30 shadow-2xl overflow-hidden mb-4 shrink-0 bg-slate-800">
          <ProfileAvatar
            src={resolvedAvatar}
            name={resolvedDisplayName}
            size={128}
          />
        </div>

        {/* Name and Verified Badge */}
        <div className="flex items-center justify-center gap-2 text-center px-2">
          <h1 className={`text-2xl sm:text-3xl font-extrabold ${currentTheme.headingColor} tracking-tight break-words`}>
            {resolvedDisplayName}
          </h1>
          <FontAwesomeIcon icon={faCircleCheck} className="text-blue-400 text-lg shrink-0" title="Verified Profile" />
        </div>

        {/* Handle / Location Subtitle */}
        <p className={`text-xs sm:text-sm font-medium ${currentTheme.mutedTextColor} text-center mt-1`}>
          @{uri} {page.location ? `• ${page.location}` : ''}
        </p>

        {/* Bio */}
        {page.bio && (
          <div className="max-w-md mx-auto text-center mt-3 mb-6 px-2">
            <p className={`${currentTheme.mutedTextColor} leading-relaxed text-xs sm:text-sm break-words`}>
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
                           shadow-md hover:shadow-lg transition-all duration-200 w-11 h-11 sm:w-12 sm:h-12 min-w-[44px] min-h-[44px] hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none hover:brightness-110"
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

        {/* Links Stack - Server-authoritative lifecycle filtering (LINK-01..LINK-04) */}
        <div className="w-full space-y-3.5 max-w-xl mx-auto">
          {liveLinks.map((link, index) => {
            const linkKey = link._id?.toString() || link.id?.toString() || `${link.url}-${index}`;
            return (
              <Link
                key={linkKey}
                href={link.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                ping={`${process.env.NEXT_PUBLIC_URL || ''}api/click?url=${btoa(link.url || '')}&page=${page.uri}`}
                className={`group relative ${currentTheme.cardBg} ${currentTheme.cardBorder} rounded-2xl flex items-center p-4 sm:p-4.5 gap-4 
                         transition-all duration-200 backdrop-blur-md hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[68px] w-full`}
              >
                <div className={`${currentTheme.iconBg} w-12 h-12 rounded-xl 
                              flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/15 shadow-inner`}>
                  <LinkIcon
                    src={link.icon}
                    title={link.title || 'Untitled Link'}
                    size={48}
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h3 className={`font-bold text-sm sm:text-base truncate ${currentTheme.headingColor}`}>
                    {link.title || 'Untitled Link'}
                  </h3>
                  {link.subtitle && (
                    <p className={`${currentTheme.subtitleColor} text-xs truncate mt-0.5`}>
                      {link.subtitle}
                    </p>
                  )}
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="text-xs opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
                />
              </Link>
            );
          })}
        </div>
      </main>

      {/* Made with Linktree Footer */}
      <footer className="text-center py-6 pb-8">
        <Link
          href="/"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-semibold backdrop-blur-md transition-all shadow-xs hover:scale-105 active:scale-95 ${
            isDarkTheme
              ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white/90'
              : 'bg-slate-200/80 hover:bg-slate-300 border-slate-300 text-slate-800'
          }`}
        >
          <FontAwesomeIcon icon={faLinkSolid} className="text-blue-500 text-[11px]" />
          <span>Made with Linktree</span>
        </Link>
      </footer>
    </div>
  );
};

export default UserPage;