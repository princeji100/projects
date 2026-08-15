import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faGlobe,
  faShieldHalved,
  faUserShield,
  faCreditCard,
  faRotateLeft,
  faBug,
  faTriangleExclamation,
  faArrowLeft,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { COMMERCIAL_IDENTITY } from '@/lib/compliance';

export const metadata = {
  title: 'Contact | Prince Links',
  description:
    'Contact the Prince Links support team. Get assistance with account access, billing, cancellations, privacy, and technical inquiries.',
};

export default function ContactPage() {
  const supportCategories = [
    {
      title: 'Account Access & Invites',
      desc: 'Assistance with Google OAuth sign-in, invite allowlist verification, or handle reservations.',
      icon: faUserShield,
      badge: 'Account',
    },
    {
      title: 'Billing & Subscriptions',
      desc: 'Questions regarding the Pro plan (₹149/month), recurring billing, invoices, or manual cancellations.',
      icon: faCreditCard,
      badge: 'Billing',
    },
    {
      title: 'Refund Inquiries',
      desc: 'Evaluation of duplicate charge corrections, billing errors, or refund requests.',
      icon: faRotateLeft,
      badge: 'Refunds',
    },
    {
      title: 'Privacy & Data Requests',
      desc: 'Requests to export your creator profile data, update credentials, or request complete account deletion.',
      icon: faShieldHalved,
      badge: 'Privacy',
    },
    {
      title: 'Technical & Feature Support',
      desc: 'Assistance with theme rendering, media embeds, Tip Jar configuration, or analytics reporting.',
      icon: faBug,
      badge: 'Technical',
    },
    {
      title: 'Abuse & Content Reporting',
      desc: 'Report malicious links, deceptive profiles, trademark infringement, or terms violations.',
      icon: faTriangleExclamation,
      badge: 'Safety',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden pb-16">
      {/* ═══ Top Radial Ambient Glows ═══ */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

      {/* ═══ Header Section ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-8 w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs">
          <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" />
          <span>Support &bull; Customer Help &bull; Direct Contact</span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Get in touch with our team.
        </h1>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
          Have a question about your account, subscription billing, or platform policies? We&apos;re here to assist you.
        </p>
      </section>

      {/* ═══ Content Section ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex-1 space-y-8">
        
        {/* Primary Contact Card */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 relative overflow-hidden space-y-8">
          {/* Top Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          {/* Quick Contact Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 text-white">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                Official Support Channel
              </span>
              <h2 className="text-xl font-extrabold">Direct Email Support</h2>
              <p className="text-xs text-slate-400">
                All inquiries are monitored and answered directly by our support desk.
              </p>
            </div>

            <a
              href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`}
              className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm font-bold rounded-2xl transition-all shadow-md shrink-0 cursor-pointer"
            >
              <FontAwesomeIcon icon={faEnvelope} />
              <span>{COMMERCIAL_IDENTITY.supportEmail}</span>
            </a>
          </div>

          {/* Commercial & Operational Identity Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Service Details
              </span>
              <p className="font-extrabold text-slate-900 text-sm">{COMMERCIAL_IDENTITY.productName}</p>
              <p className="text-slate-600">
                Operated by <strong className="text-slate-800">{COMMERCIAL_IDENTITY.operatorName}</strong> ({COMMERCIAL_IDENTITY.businessType}) under the <strong className="text-slate-800">{COMMERCIAL_IDENTITY.brandName}</strong> brand.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Platform Origin &amp; Uptime
              </span>
              <p className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                <FontAwesomeIcon icon={faGlobe} className="text-blue-600 text-xs" />
                <span>{COMMERCIAL_IDENTITY.platformHost}</span>
              </p>
              <p className="text-slate-600 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faClock} className="text-emerald-600 text-[11px]" />
                <span>Response time: Typically 24&ndash;48 business hours</span>
              </p>
            </div>
          </div>

          {/* Support Inquiries by Category */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">How Can We Help You?</h3>
              <p className="text-xs text-slate-500">
                When emailing support, please mention the relevant category for faster routing:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {supportCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-200 hover:bg-blue-50/20 transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                      <FontAwesomeIcon icon={cat.icon} className="text-blue-600 text-xs" />
                      <span>{cat.title}</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      {cat.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{cat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-semibold pt-2">
          <Link href="/" className="hover:text-blue-600 transition flex items-center gap-1.5">
            <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
            <span>Home</span>
          </Link>
          <Link href="/pricing" className="hover:text-blue-600 transition">Pricing</Link>
          <Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link>
          <Link href="/refund-policy" className="hover:text-blue-600 transition">Refund Policy</Link>
          <Link href="/delivery-policy" className="hover:text-blue-600 transition">Delivery Policy</Link>
        </div>
      </section>
    </div>
  );
}
