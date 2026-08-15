import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faEnvelope,
  faArrowLeft,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import { COMMERCIAL_IDENTITY } from '@/lib/compliance';

export default function PolicyLayout({
  badge = 'Policy & Compliance',
  title,
  subtitle,
  children,
}) {
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden pb-16">
      {/* ═══ Background Ambient Aurora Glows ═══ */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

      {/* ═══ Header Section ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-8 w-full text-center space-y-4">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs">
          <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" />
          <span>
            {badge} &bull; Last Updated: {COMMERCIAL_IDENTITY.lastUpdated}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          {title}
        </h1>

        {subtitle && (
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
      </section>

      {/* ═══ Content Card ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 w-full flex-1">
        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 relative overflow-hidden space-y-8 text-slate-700 text-sm leading-relaxed">
          {/* Subtle Top Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          {children}

          {/* Support & Commercial Entity Footer Card */}
          <div className="pt-6 border-t border-slate-100 bg-slate-50/80 -mx-6 -mb-6 sm:-mx-10 sm:-mb-10 p-6 sm:p-8 space-y-4 rounded-b-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Need Help or Have Questions?
                </p>
                <p className="text-xs text-slate-500">
                  Our team is here to assist with billing, policies, and account access.
                </p>
              </div>

              <a
                href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <FontAwesomeIcon icon={faEnvelope} />
                <span>{COMMERCIAL_IDENTITY.supportEmail}</span>
              </a>
            </div>

            <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
              <span>
                {COMMERCIAL_IDENTITY.productName} is a digital service operated by{' '}
                <strong className="text-slate-700">{COMMERCIAL_IDENTITY.operatorName}</strong> under the{' '}
                <strong className="text-slate-700">{COMMERCIAL_IDENTITY.brandName}</strong> brand.
              </span>
              <span className="flex items-center gap-1">
                <FontAwesomeIcon icon={faGlobe} className="text-slate-400 text-[10px]" />
                <span>{COMMERCIAL_IDENTITY.platformHost}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="pt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
            <span>Back to Prince Links Home</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
