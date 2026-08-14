import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCompass,
  faArrowRight,
  faHouse,
  faSparkles,
  faShieldHalved,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import LinktreeLogo from '@/components/media/LinktreeLogo';

export const metadata = {
  title: 'Profile Not Found | Linktree',
  description: 'The requested Linktree creator profile does not exist or is waiting to be claimed.',
};

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* ═══ Background Ambient Aurora Glows ═══ */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/15 to-purple-600/15 blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-blue-500/10 blur-3xl pointer-events-none -z-10" />

      {/* ═══ TOP MINIMAL HEADER ═══ */}
      <header className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between z-10">
        <Link
          href="/"
          className="hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl p-1"
        >
          <LinktreeLogo darkBg={true} />
        </Link>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <Link
            href="/about"
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            About
          </Link>
          <Link
            href="/login"
            className="text-slate-400 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ═══ MAIN 404 CARD ═══ */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 z-10">
        <div className="max-w-md w-full text-center space-y-6 bg-slate-900/80 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl shadow-black/50 relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          
          {/* Subtle Top Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

          {/* Glowing Animated Icon */}
          <div className="relative mx-auto w-20 h-20">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-500/20 to-indigo-500/20 text-blue-400 rounded-3xl flex items-center justify-center ring-1 ring-blue-500/30 shadow-inner">
              <FontAwesomeIcon icon={faCompass} className="text-3xl animate-spin-slow" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500"></span>
            </span>
          </div>

          {/* Typography */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[11px] font-mono font-medium">
              <span>Status: 404 Not Found</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Profile Not Found
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              This Linktree profile does not exist, may have been renamed, or is waiting to be claimed by a creator.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              <FontAwesomeIcon icon={faSparkles} className="text-blue-200 text-xs" />
              <span>Claim a Handle</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 active:scale-95 text-slate-200 text-xs font-semibold px-5 py-3.5 rounded-2xl transition-all"
            >
              <FontAwesomeIcon icon={faHouse} className="text-slate-400 text-xs" />
              <span>Back Home</span>
            </Link>
          </div>

          {/* Security & Authenticity Footnote */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <FontAwesomeIcon icon={faShieldHalved} className="text-blue-500" />
            <span>Verified Invite-Only Creator Platform</span>
          </div>
        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 z-10">
        <span>&copy; {new Date().getFullYear()} Linktree. Main Portfolio: <a href="https://princeji.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-400 underline transition">princeji.com</a></span>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hover:text-slate-300 transition">About</Link>
          <Link href="/login" className="hover:text-slate-300 transition">Apply for Invite</Link>
        </div>
      </footer>
    </div>
  );
}
