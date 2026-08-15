import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faClock,
  faSparkles,
  faShieldHalved,
  faArrowRight,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';
import { COMMERCIAL_IDENTITY, PRICING_DETAILS } from '@/lib/compliance';
import { PRODUCT_NAME } from '@/lib/brand';

export const metadata = {
  title: 'Pricing | Prince Links',
  description:
    'Transparent pricing for Prince Links. Start free or upgrade to Pro for ₹149/month for advanced analytics and white-label creator profiles.',
};

export default function PricingPage() {
  const freeFeatures = [
    'Custom creator profile handle (links.princeji.com/yourname)',
    'Unlimited links with status badges (HOT, NEW, PIN, OFFER)',
    'Link scheduling & start/end time windows',
    '8+ curated gradient themes & typography presets',
    'Peer-to-peer creator UPI Tip Jar integration',
    'Rich media embeds (YouTube, Spotify, Apple Music, SoundCloud)',
    '1024px print-ready QR code downloads',
    '7-day and 30-day continuous engagement analytics',
    'Raw CSV report export & Print / Save PDF formatting',
    '25 MB encrypted file storage for avatars & backgrounds',
  ];

  const proWorkingFeatures = [
    {
      title: 'Remove Platform Branding',
      desc: 'Completely hides "Made with Prince Links" footer and preview watermark on public profiles.',
    },
    {
      title: '90-Day Analytics History',
      desc: '3 months of continuous daily clicks, views, device breakdowns, and referrer insights.',
    },
    {
      title: '1-Year Analytics History',
      desc: '365 days of comprehensive audience performance tracking and annual reporting.',
    },
  ];

  const proPlannedFeatures = [
    {
      title: 'Custom Domain Mapping',
      desc: 'Connect your personal primary domain (e.g. yourname.com) directly to your profile.',
    },
    {
      title: 'Multiple Profiles',
      desc: 'Manage multiple distinct creator personas under one verified account.',
    },
    {
      title: 'Advanced SEO & Social Previews',
      desc: 'Custom OpenGraph cards, rich snippets, and metadata customization.',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden pb-16">
      {/* ═══ Top Radial Ambient Glows ═══ */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

      {/* ═══ Header Section ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-10 w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs">
          <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" />
          <span>Simple, Honest &bull; Transparent Pricing</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Plans built for creators of every scale.
        </h1>

        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Start for free with our comprehensive creator toolkit, or upgrade to Pro for extended analytics history and a fully white-labeled profile.
        </p>
      </section>

      {/* ═══ 2-Column Pricing Cards Grid ═══ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 w-full flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* ═══ Standard Free Card ═══ */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-lg shadow-slate-200/40 flex flex-col justify-between relative space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Standard Tier
                </span>
                <h2 className="text-3xl font-black text-slate-900">{PRICING_DETAILS.free.name}</h2>
                <p className="text-xs text-slate-500">{PRICING_DETAILS.free.headline}</p>
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-slate-900 font-mono">
                  {PRICING_DETAILS.free.price}
                </span>
                <span className="text-xs text-slate-500 ml-2 font-medium">/ forever</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                Full access to all baseline {PRODUCT_NAME} features. Free access remains permanently available for approved creators.
              </p>

              {/* Included Free Features */}
              <div className="space-y-2.5 pt-2">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Included Capabilities:
                </p>
                <ul className="space-y-2 text-xs text-slate-600">
                  {freeFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/"
                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Start Free</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
              </Link>
            </div>
          </div>

          {/* ═══ Pro Plan Card ═══ */}
          <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl shadow-slate-900/30 flex flex-col justify-between relative space-y-6">
            {/* Top Popular Badge */}
            <div className="absolute -top-3.5 right-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[11px] font-bold px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5">
              <FontAwesomeIcon icon={faSparkles} className="text-[10px]" />
              <span>Creator Pro</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Professional Tier
                </span>
                <h2 className="text-3xl font-black text-white">{PRICING_DETAILS.pro.name}</h2>
                <p className="text-xs text-slate-400">{PRICING_DETAILS.pro.headline}</p>
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-white font-mono">
                  {PRICING_DETAILS.pro.price}
                </span>
                <span className="text-xs text-slate-400 ml-2 font-medium">/ month</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-4">
                Monthly recurring subscription. No yearly lock-in, no hidden fees, and cancel anytime.
              </p>

              {/* Working Pro Capabilities */}
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  Available Pro Capabilities:
                </p>
                <ul className="space-y-2.5 text-xs text-slate-200">
                  {proWorkingFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                      <div>
                        <strong className="text-white block">{feat.title}</strong>
                        <span className="text-slate-400 text-[11px] leading-tight">{feat.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Planned Capabilities */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faClock} className="text-amber-400 text-[10px]" />
                  <span>Planned Future Roadmap (Not Yet Available):</span>
                </p>
                <ul className="space-y-2 text-xs text-slate-400">
                  {proPlannedFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                        Planned
                      </span>
                      <span>
                        <strong className="text-slate-300">{feat.title}</strong> &ndash; {feat.desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              <Link
                href="/dashboard/billing"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Upgrade to Pro</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
              </Link>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 text-center">
                <FontAwesomeIcon icon={faCircleInfo} className="text-blue-400 text-[10px]" />
                <span>Online checkout is being prepared. View status in dashboard billing.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial Operator Note */}
        <div className="mt-12 p-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800">
              {COMMERCIAL_IDENTITY.productName} is operated by {COMMERCIAL_IDENTITY.operatorName} under the {COMMERCIAL_IDENTITY.brandName} brand.
            </p>
            <p className="text-slate-500 mt-0.5">
              Have questions about plans or billing? Contact us at{' '}
              <a
                href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`}
                className="text-blue-600 hover:underline font-semibold"
              >
                {COMMERCIAL_IDENTITY.supportEmail}
              </a>
            </p>
          </div>
          <Link
            href="/terms"
            className="text-slate-700 hover:text-blue-600 font-semibold underline shrink-0"
          >
            Terms of Service &rarr;
          </Link>
        </div>
      </section>
    </div>
  );
}
