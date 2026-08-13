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

      <div className="max-w-4xl mx-auto px-6 -mt-32 relative z-10 pb-16">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Avatar Section */}
          <div className="flex flex-col items-center -mt-20 sm:-mt-24 mb-6">
            <ProfileAvatar
              src={user?.image}
              name={page.displayName || user?.name || uri}
              size={128}
            />
          </div>

          <h2 className={`text-2xl sm:text-3xl font-bold text-center mb-1 ${currentTheme.headingColor} tracking-tight`}>
            {page.displayName || uri}
          </h2>

          {page.location && (
            <h3 className={`text-sm sm:text-base ${currentTheme.mutedTextColor} flex items-center justify-center gap-2 mb-4 font-medium`}>
              <FontAwesomeIcon icon={faMapMarkerAlt} className="opacity-80" />
              <span>{page.location}</span>
            </h3>
          )}

          {page.bio && (
            <div className="max-w-md mx-auto text-center mb-10">
              <p className={`${currentTheme.mutedTextColor} leading-relaxed text-sm sm:text-base`}>
                {page.bio}
              </p>
            </div>
          )}

          {/* Social Buttons */}
          {page.buttons && Object.keys(page.buttons).length > 0 && (
            <div className="flex flex-wrap gap-4 justify-center mt-4 mb-10">
              {Object.keys(page.buttons).map((buttonKey) => (
                <Link
                  key={buttonKey}
                  href={buttonLink(buttonKey, page.buttons[buttonKey])}
                  className={`rounded-full p-4 flex items-center justify-center ${currentTheme.buttonStyle} backdrop-blur-sm 
                           shadow-lg hover:shadow-xl transition-all duration-300 w-14 h-14 hover:-translate-y-1`}
                >
                  <FontAwesomeIcon
                    className="h-6 w-6"
                    icon={iconMapping[buttonKey] || faGlobe}
                  />
                </Link>
              ))}
            </div>
          )}

          {/* Links Grid - Server-authoritative lifecycle filtering (LINK-01..LINK-04) */}
          <div className="grid md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto">
            {liveLinks.map((link, index) => {
              const linkKey = link._id?.toString() || link.id?.toString() || `${link.url}-${index}`;
              return (
                <Link
                  key={linkKey}
                  href={link.url || '#'}
                  target="_blank"
                  ping={`${process.env.NEXT_PUBLIC_URL || ''}api/click?url=${btoa(link.url || '')}&page=${page.uri}`}
                  className={`group relative ${currentTheme.cardBg} ${currentTheme.cardBorder} rounded-xl flex items-center p-5 gap-5 
                           transition-all duration-300 backdrop-blur-sm hover:-translate-y-1 hover:shadow-xl`}
                >
                  <div className={`${currentTheme.iconBg} w-16 h-16 rounded-full 
                                flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white/10`}>
                    <LinkIcon
                      src={link.icon}
                      title={link.title || 'Untitled Link'}
                      size={64}
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className={`font-semibold text-lg truncate ${currentTheme.headingColor}`}>
                      {link.title || 'Untitled Link'}
                    </h3>
                    {link.subtitle && (
                      <p className={`${currentTheme.subtitleColor} text-sm truncate`}>
                        {link.subtitle}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;