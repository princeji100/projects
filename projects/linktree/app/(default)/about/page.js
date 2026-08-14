import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faPaintBrush,
  faQrcode,
  faChartLine,
  faCloudArrowUp,
  faCode,
  faExternalLinkAlt,
  faEnvelope,
  faLock,
  faGlobe,
  faCheckCircle,
  faArrowRight,
  faCircleQuestion,
  faSparkles,
} from "@fortawesome/free-solid-svg-icons";
import {
  faGithub,
  faLinkedin,
  faTwitter,
} from "@fortawesome/free-brands-svg-icons";
import LinktreeLogo from "@/components/media/LinktreeLogo";

export const metadata = {
  title: "About | Linktree Platform & Creator Info",
  description: "Learn about the invite-only Linktree platform architecture, features, and developer Prince Ji (main portfolio: princeji.com).",
};

export default function AboutPage() {
  const faqs = [
    {
      q: "Why is this Linktree platform invite-only?",
      a: "To ensure maximum performance, zero bot traffic, and guaranteed high-speed AWS edge delivery, access is strictly limited to verified creators and approved portfolios.",
    },
    {
      q: "How can I get an invite or early access?",
      a: "You can apply directly from the Login page by submitting your Google email and desired handle. The platform administrator reviews and approves applications daily.",
    },
    {
      q: "Is the platform free for invited creators?",
      a: "Yes, 100% free with unlimited links, custom gradient themes, 1024px print QR code exports, and real-time click analytics.",
    },
    {
      q: "Where is user data and uploaded media stored?",
      a: "User accounts and analytics are secured in MongoDB Atlas, while high-resolution profile avatars, backgrounds, and link icons are stored in encrypted AWS S3 buckets.",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden">
      {/* ═══ Background Ambient Glows ═══ */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

      {/* ═══ HERO SECTION ═══ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 w-full text-center space-y-5">
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold shadow-xs">
          <FontAwesomeIcon icon={faShieldHalved} className="text-blue-600" />
          <span>Platform Overview &bull; Architecture &bull; Creator Info</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] max-w-2xl mx-auto">
          About <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">Linktree</span>
        </h1>

        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          A modern, multi-tenant link-in-bio platform engineered for verified creators, developers, and portfolios to share everything in one unified link.
        </p>
      </section>

      {/* ═══ DEVELOPER & CREATOR SPOTLIGHT ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 w-full">
        <div className="bg-white p-6 sm:p-9 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 relative overflow-hidden space-y-8">
          
          {/* Subtle Top Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8 text-center md:text-left">
            {/* Avatar with Verified Ring */}
            <div className="relative shrink-0">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden ring-4 ring-blue-500/20 shadow-xl relative">
                <Image
                  src="/prince.jpg"
                  fill
                  alt="Prince Ji - Platform Creator"
                  className="object-cover object-top"
                  priority
                />
              </div>
              <span className="absolute -bottom-2 -right-2 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md border-2 border-white flex items-center gap-1">
                <FontAwesomeIcon icon={faCheckCircle} className="text-[10px]" />
                <span>Verified</span>
              </span>
            </div>

            {/* Bio & Details */}
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Prince Ji</h2>
                  <span className="text-xs font-mono font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                    Lead Engineer &amp; Creator
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  princesrivastav216@gmail.com
                </p>
              </div>

              <p className="text-slate-600 text-sm leading-relaxed">
                Full-Stack Software Engineer specializing in modern web ecosystems, cloud infrastructure, and interactive developer platforms. This Linktree application is built from scratch as an exclusive, multi-tenant link platform.
              </p>

              {/* Primary Portfolio & External Social Badges */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                {/* Main Portfolio Link */}
                <a
                  href="https://princeji.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <FontAwesomeIcon icon={faGlobe} className="text-blue-400" />
                  <span>Main Portfolio: princeji.com</span>
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px] text-slate-400" />
                </a>

                {/* GitHub */}
                <a
                  href="https://github.com/princeji100"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all active:scale-95"
                  title="GitHub Profile"
                >
                  <FontAwesomeIcon icon={faGithub} className="text-sm" />
                  <span>GitHub</span>
                </a>

                {/* Contact Email */}
                <a
                  href="mailto:Princesrivastav216@gmail.com"
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl transition-all active:scale-95"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="text-xs" />
                  <span>Get in Touch</span>
                </a>
              </div>
            </div>
          </div>

          {/* Tech Stack Chips */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block text-center md:text-left">
              Platform Engineering Stack:
            </span>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">Next.js 15 (App Router)</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">React 19</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">MongoDB Atlas</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">AWS S3 Cloud Media</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">Tailwind CSS</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-mono font-medium">NextAuth.js (Google OAuth)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4 CORE ARCHITECTURAL PILLARS ═══ */}
      <section className="bg-slate-50 border-y border-slate-200/80 py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Platform Core Features
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Engineered with modern web standards for performance and security.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faLock} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Invite-Only Access Control</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Database-driven allowlist system protects the network from spam and guarantees verified creator identities.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faPaintBrush} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">8+ Themes &amp; Custom Gradients</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Dynamic 2-color linear/radial gradient engine with dark contrast overlays for crystal-clear readability.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faQrcode} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">1024px Print-Ready QR Codes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Off-screen 1024×1024 native canvas generator and vector SVG export with centered brand logo.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs space-y-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
                <FontAwesomeIcon icon={faChartLine} />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Pure SVG Real-Time Analytics</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Zero-dependency interactive SVG area charts, device breakdown, and click rankings with zero external script lag.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FAQ SECTION ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            <FontAwesomeIcon icon={faCircleQuestion} />
            <span>Common Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2"
            >
              <h3 className="font-bold text-slate-900 text-sm flex items-start gap-2">
                <span className="text-blue-600 font-extrabold">Q.</span>
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ BOTTOM CALL TO ACTION ═══ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-16 w-full">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-7 sm:p-9 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-extrabold">Join Linktree</h3>
            <p className="text-blue-100 text-xs sm:text-sm max-w-md">
              Claim your unique handle today or request early access if you need an invite.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/"
              className="px-5 py-3 bg-white text-slate-900 hover:bg-slate-100 active:scale-95 text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Claim Handle &rarr;
            </Link>
            <Link
              href="/login"
              className="px-5 py-3 bg-blue-700/60 hover:bg-blue-700 border border-blue-400/40 text-white active:scale-95 text-xs font-bold rounded-xl transition-all"
            >
              Sign In / Apply
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <LinktreeLogo boxSize="w-6 h-6" iconSize="text-[10px]" textSize="text-sm" />
            <span>&copy; {new Date().getFullYear()} Linktree. Main Portfolio: <a href="https://princeji.com" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-700 hover:text-blue-600 transition underline">princeji.com</a></span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition">Home</Link>
            <Link href="/login" className="hover:text-blue-600 transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}