import connectToDatabase from '@/lib/connectToDB';
import Event from '@/models/Event';
import Page from '@/models/Page';
import User from '@/models/User';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import {
  faDiscord,
  faFacebook,
  faGithub,
  faInstagram,
  faLinkedin,
  faPinterest,
  faReddit,
  faSnapchat,
  faTelegram,
  faTwitter,
  faViber,
  faWhatsapp,
  faYoutube,
} from '@fortawesome/free-brands-svg-icons';
import {
  faMapMarkerAlt,
  faEnvelope,
  faPhone,
  faGlobe,
  faChevronRight,
  faLink as faLinkSolid,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Link from 'next/link';
import ProfileAvatar from '@/components/media/ProfileAvatar';
import LinkIcon from '@/components/media/LinkIcon';
import { isLinkLive } from '@/lib/linkLifecycle';
import { getTheme } from '@/lib/themes';
import { parseDevice, normalizeReferrer } from '@/lib/analyticsParser';
import { getBaseUrl } from '@/lib/siteUrl';

const iconMapping = {
  email: faEnvelope,
  mobile: faPhone,
  instagram: faInstagram,
  facebook: faFacebook,
  discord: faDiscord,
  youtube: faYoutube,
  whatsapp: faWhatsapp,
  telegram: faTelegram,
  viber: faViber,
  snapchat: faSnapchat,
  pinterest: faPinterest,
  reddit: faReddit,
  website: faGlobe,
  github: faGithub,
  twitter: faTwitter,
  linkedin: faLinkedin,
};

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

  // Phase 4: Theme resolution - preset styling ONLY applies when bgType === 'preset'
  const isPreset = page.bgType === 'preset';
  const defaultTheme = getTheme('default');
  const currentTheme = isPreset ? getTheme(page.theme) : defaultTheme;

  let headerStyle = {};
  let pageBgClass = isPreset ? currentTheme.pageBg : 'bg-blue-950';
  let headerOverlayClass = isPreset
    ? currentTheme.headerOverlay
    : 'bg-gradient-to-b from-black/20 via-transparent to-blue-950/90';

  if (isPreset) {
    headerStyle = { backgroundColor: currentTheme.headerBg };
  } else if (page.bgType === 'color') {
    headerStyle = { backgroundColor: page.bgColor || '#000' };
  } else if (page.bgType === 'image' && page.bgImage) {
    headerStyle = { backgroundImage: `url(${page.bgImage})` };
  } else {
    headerStyle = { backgroundColor: '#1e293b' };
  }

  // Phase 3: Single now capture per render pass
  const renderNow = new Date();
  const liveLinks = (page.links || []).filter((link) => isLinkLive(link, renderNow));

  return (
    <div className={`min-h-screen ${pageBgClass} ${currentTheme.textColor} transition-colors duration-300`}>
      {/* Header Banner */}
      <div
        className="h-80 bg-slate-900 bg-cover bg-center transition-all duration-300 relative shadow-inner"
        style={headerStyle}
      >
        <div className={`absolute inset-0 ${headerOverlayClass}`} />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-28 sm:-mt-32 relative z-10 pb-16">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl transition-all">
          {/* Avatar Section */}
          <div className="flex flex-col items-center -mt-18 sm:-mt-24 mb-5 sm:mb-6">
            <div className="rounded-full ring-4 ring-white/20 shadow-xl overflow-hidden">
              <ProfileAvatar
                src={user?.image}
                name={page.displayName || user?.name || uri}
                size={128}
              />
            </div>
          </div>

          <h1 className={`text-2xl sm:text-3xl font-bold text-center mb-1.5 ${currentTheme.headingColor} tracking-tight break-words px-2`}>
            {page.displayName || uri}
          </h1>

          {page.location && (
            <div className="flex justify-center mb-3">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs sm:text-sm ${currentTheme.mutedTextColor} font-medium`}>
                <FontAwesomeIcon icon={faMapMarkerAlt} className="opacity-80 text-[11px]" />
                <span className="truncate max-w-[240px]">{page.location}</span>
              </div>
            </div>
          )}

          {page.bio && (
            <div className="max-w-md mx-auto text-center mb-8 px-2">
              <p className={`${currentTheme.mutedTextColor} leading-relaxed text-sm sm:text-base break-words`}>
                {page.bio}
              </p>
            </div>
          )}

          {/* Social Buttons */}
          {page.buttons && Object.keys(page.buttons).length > 0 && (
            <div className="flex flex-wrap gap-3 sm:gap-4 justify-center mt-2 mb-8">
              {Object.keys(page.buttons).map((buttonKey) => (
                <Link
                  key={buttonKey}
                  href={buttonLink(buttonKey, page.buttons[buttonKey])}
                  aria-label={`Open ${buttonKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`rounded-full p-3.5 sm:p-4 flex items-center justify-center ${currentTheme.buttonStyle} backdrop-blur-sm 
                           shadow-md hover:shadow-lg transition-all duration-200 w-12 h-12 sm:w-14 sm:h-14 min-w-[44px] min-h-[44px] hover:scale-105 active:scale-95 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none`}
                >
                  <FontAwesomeIcon
                    className="h-5 w-5 sm:h-6 sm:w-6"
                    icon={iconMapping[buttonKey] || faGlobe}
                  />
                </Link>
              ))}
            </div>
          )}

          {/* Links Grid - Server-authoritative lifecycle filtering (LINK-01..LINK-04) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 w-full max-w-3xl mx-auto">
            {liveLinks.map((link, index) => {
              const linkKey = link._id?.toString() || link.id?.toString() || `${link.url}-${index}`;
              return (
                <Link
                  key={linkKey}
                  href={link.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  ping={`${process.env.NEXT_PUBLIC_URL || ''}api/click?url=${btoa(link.url || '')}&page=${page.uri}`}
                  className={`group relative ${currentTheme.cardBg} ${currentTheme.cardBorder} rounded-2xl flex items-center p-4 sm:p-5 gap-4 
                           transition-all duration-200 backdrop-blur-sm hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none min-h-[72px]`}
                >
                  <div className={`${currentTheme.iconBg} w-14 h-14 sm:w-16 sm:h-16 rounded-xl 
                                flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-white/15 shadow-inner`}>
                    <LinkIcon
                      src={link.icon}
                      title={link.title || 'Untitled Link'}
                      size={64}
                    />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className={`font-semibold text-base sm:text-lg truncate ${currentTheme.headingColor}`}>
                      {link.title || 'Untitled Link'}
                    </h3>
                    {link.subtitle && (
                      <p className={`${currentTheme.subtitleColor} text-xs sm:text-sm truncate mt-0.5`}>
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

          {/* Made with Linktree presentational footer badge */}
          <div className="text-center mt-10 pt-4 border-t border-white/5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all shadow-xs hover:scale-105 active:scale-95"
            >
              <FontAwesomeIcon icon={faLinkSolid} className="text-blue-400 text-[10px]" />
              <span>Made with Linktree</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;