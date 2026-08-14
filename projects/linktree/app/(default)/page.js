import HeroForm from "@/components/forms/HeroForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSparkles,
  faQrcode,
  faChartLine,
  faPaintBrush,
  faLock,
  faShieldHalved,
  faCheckCircle,
  faArrowRight,
  faCloudArrowUp,
  faLayerGroup,
  faEnvelope,
  faExternalLinkAlt,
  faShareNodes,
} from "@fortawesome/free-solid-svg-icons";
import {
  faInstagram,
  faTwitter,
  faGithub,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import LinktreeLogo from "@/components/media/LinktreeLogo";

export const metadata = {
  title: "Linktree | Exclusive Link in Bio Platform for Creators",
  description: "Share your links, custom gradient themes, social media, and 1024px scannable QR codes on a single verified profile.",
};

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between overflow-hidden">
      {/* ═══ Top Radial Ambient Glows ═══ */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

      {/* ═══ HERO SECTION (2-Column Desktop Grid) ═══ */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-16 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ═══ Left Column: Copy & Claim Form ═══ */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            
            {/* Invite-Only Glowing Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-bold shadow-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <FontAwesomeIcon icon={faLock} className="text-[11px] text-amber-600" />
              <span>Exclusive &bull; Invite-Only Creator Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Everything you are. <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                In one simple link.
              </span>
            </h1>

            {/* Subtitle with Invite Context */}
            <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0">
              An exclusive, spam-free link in bio ecosystem for invited creators, developers, and portfolios. Share your links, custom gradient themes, and print-ready HD QR codes on a verified profile.
            </p>

            {/* Claim Username Box */}
            <div className="bg-white p-3.5 sm:p-5 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 max-w-lg mx-auto lg:mx-0">
              <div className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center justify-between">
                <span>Reserve your custom handle:</span>
                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Instant Whitelist Check
                </span>
              </div>
              <HeroForm />
              <p className="text-[11px] text-slate-600 mt-2.5 flex items-center gap-1.5 justify-center lg:justify-start">
                <FontAwesomeIcon icon={faShieldHalved} className="text-emerald-500 text-xs" />
                <span>Invited Google accounts receive instant access upon claiming.</span>
              </p>
            </div>

            {/* Key Platform Highlights */}
            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs font-semibold text-slate-600">
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="text-blue-600" />
                <span>100% Free for Invited Users</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="text-blue-600" />
                <span>8+ Curated Themes</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheckCircle} className="text-blue-600" />
                <span>1024px Print QR Export</span>
              </div>
            </div>
          </div>

          {/* ═══ Right Column: Interactive Floating Phone Mockup ═══ */}
          <div className="lg:col-span-5 flex justify-center relative">
            
            {/* Ambient Background Glow behind Phone */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-full blur-3xl transform scale-90 -z-10" />

            {/* Phone Container */}
            <div className="relative w-full max-w-[310px] sm:max-w-[330px] rounded-[44px] bg-slate-900 p-3.5 shadow-2xl shadow-slate-900/30 border-[6px] border-slate-800 transform hover:scale-[1.02] transition-all duration-500">
              
              {/* Dynamic Island / Speaker Notch */}
              <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
              </div>

              {/* Inside Screen Mockup with Gradient */}
              <div className="rounded-[34px] bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 p-5 text-white shadow-inner flex flex-col items-center space-y-4 relative overflow-hidden">
                
                {/* Subtle Grid / Star Effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

                {/* Profile Avatar with Verified Badge */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-1 shadow-lg">
                    <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold overflow-hidden border-2 border-white/20">
                      👨‍💻
                    </div>
                  </div>
                  <span className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] shadow-md border-2 border-slate-900" title="Verified Creator">
                    ✓
                  </span>
                </div>

                {/* Name & Bio */}
                <div className="text-center space-y-1">
                  <h3 className="font-bold text-base tracking-tight text-white flex items-center justify-center gap-1.5">
                    <span>Prince Ji</span>
                  </h3>
                  <p className="text-xs font-mono text-blue-300">@princeji</p>
                  <p className="text-[11px] text-slate-300 max-w-[200px] leading-snug pt-0.5">
                    Building next-generation digital experiences &amp; full-stack apps.
                  </p>
                </div>

                {/* Social Icons Bar */}
                <div className="flex items-center gap-3 text-slate-300 text-sm py-0.5">
                  <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition cursor-pointer">
                    <FontAwesomeIcon icon={faTwitter} className="text-xs" />
                  </span>
                  <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition cursor-pointer">
                    <FontAwesomeIcon icon={faGithub} className="text-xs" />
                  </span>
                  <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition cursor-pointer">
                    <FontAwesomeIcon icon={faInstagram} className="text-xs" />
                  </span>
                  <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition cursor-pointer">
                    <FontAwesomeIcon icon={faYoutube} className="text-xs" />
                  </span>
                </div>

                {/* Mockup Link Buttons */}
                <div className="w-full space-y-2.5 pt-1">
                  <div className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-semibold text-center flex items-center justify-between shadow-xs transition cursor-pointer">
                    <span>🚀 Featured Projects</span>
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px] text-white/50" />
                  </div>
                  <div className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-semibold text-center flex items-center justify-between shadow-xs transition cursor-pointer">
                    <span>✍️ Tech Blog & Articles</span>
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px] text-white/50" />
                  </div>
                  <div className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-semibold text-center flex items-center justify-between shadow-xs transition cursor-pointer">
                    <span>📬 Contact & Inquiries</span>
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px] text-white/50" />
                  </div>
                </div>

                {/* Footer Brand Tag */}
                <div className="pt-2 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>Powered by Linktree</span>
                </div>
              </div>
            </div>

            {/* Floating Glassmorphism Metric Badge */}
            <div className="hidden sm:flex absolute -bottom-4 -left-6 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-200/90 shadow-xl items-center gap-3 animate-bounce duration-1000">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                📈
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">+142 Views Today</div>
                <div className="text-[10px] text-slate-500 font-medium">Real-Time Traffic</div>
              </div>
            </div>

            {/* Floating QR Badge */}
            <div className="hidden sm:flex absolute -top-3 -right-4 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-xl items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs">
                <FontAwesomeIcon icon={faQrcode} />
              </div>
              <div className="text-[11px] font-bold text-slate-900">1024px Print QR</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: EXCLUSIVE INVITE-ONLY ARCHITECTURE ═══ */}
      <section className="bg-slate-900 text-white py-14 px-4 sm:px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/30 -z-10" />

        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
              <span>Invite-Only Whitelist Protection</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Why an Invite-Only Network?
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              We maintain an exclusive, high-trust ecosystem designed specifically for verified creators, ensuring lightning speed, zero spam, and guaranteed link reliability.
            </p>
          </div>

          {/* 3 Pillars of Invite Protection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-base">
                <FontAwesomeIcon icon={faShieldHalved} />
              </div>
              <h3 className="text-base font-bold text-white">Zero Spam & Bot Free</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Only authenticated Google accounts on the approved invite list can publish profiles, keeping the directory clean and trustworthy.
              </p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-base">
                <FontAwesomeIcon icon={faSparkles} />
              </div>
              <h3 className="text-base font-bold text-white">Premium Cloud Bandwidth</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guaranteed high-speed edge caching with AWS S3 asset delivery ensures your page loads instantly for millions of mobile visitors.
              </p>
            </div>

            <div className="bg-slate-800/80 backdrop-blur-md p-5 rounded-2xl border border-slate-700/80 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base">
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <h3 className="text-base font-bold text-white">Verified Creator Identity</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every page owner is verified, ensuring authentic identity protection for your brand, links, and social channels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: 4 POWERFUL FEATURES ═══ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Engineered for Creators & Developers
          </h2>
          <p className="text-slate-500 text-sm">
            Everything you need to customize, share, and track your online presence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-xs">
              <FontAwesomeIcon icon={faPaintBrush} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">8+ Curated Themes & Gradient Builder</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Choose from designer presets like Sunset, Ocean, Cyber, and Neon, or customize your own 2-color linear/radial gradients with contrast overlay.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shadow-xs">
              <FontAwesomeIcon icon={faQrcode} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Print-Ready 1024px QR Codes</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Export ultra-crisp 1024×1024 PNG and vector SVG QR codes with center brand logos, ready for business cards, merchandise, and banners.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-xs">
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Real-Time Traffic & Click Analytics</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Monitor page views, link click rankings, mobile vs. desktop visitor platforms, and top referral channels with continuous timeline graphs.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shadow-xs">
              <FontAwesomeIcon icon={faCloudArrowUp} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Cloud Media Vault & Asset Selector</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Store avatars, backgrounds, and custom link icons in your personal AWS S3 media vault. Pick and reuse any image across your dashboard with 1 click.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ SECTION: HOW IT WORKS (3 SIMPLE STEPS) ═══ */}
      <section className="bg-slate-50 border-t border-slate-200/80 py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Get Started in 3 Easy Steps
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm">
              Simple onboarding designed for invited creators.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Claim Your Handle</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose your custom username (e.g. <code className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded font-mono text-[11px]">linktree-princeji.vercel.app/yourname</code>) to reserve your profile URL.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Sign In with Google</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Authenticate using your whitelisted Google email address for instant verified access.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 text-center space-y-3 shadow-xs">
              <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-extrabold text-sm flex items-center justify-center mx-auto shadow-sm">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Customize &amp; Share</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Add links, select gradient themes, download your 1024px QR code, and share everywhere.
              </p>
            </div>
          </div>

          {/* Need an Invite CTA Box */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 sm:p-8 rounded-3xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
            <div className="space-y-1">
              <h3 className="text-lg sm:text-xl font-bold">Don&apos;t have an invite yet?</h3>
              <p className="text-blue-100 text-xs sm:text-sm max-w-md">
                Contact the platform administrator to request access for your personal or creator brand portfolio.
              </p>
            </div>
            <Link
              href="/about"
              className="px-6 py-3 bg-white text-slate-900 hover:bg-slate-100 active:scale-95 text-xs font-bold rounded-xl transition-all shadow-md shrink-0"
            >
              Learn More in About &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <LinktreeLogo boxSize="w-6 h-6" iconSize="text-[10px]" textSize="text-sm" />
            <span>&copy; {new Date().getFullYear()} Linktree. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 font-semibold text-slate-600">
            <Link href="/about" className="hover:text-blue-600 transition">About</Link>
            <Link href="/login" className="hover:text-blue-600 transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}