import HeroForm from "@/components/forms/HeroForm";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSparkles, faQrcode, faChartLine, faPaintBrush } from "@fortawesome/free-solid-svg-icons";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-between">
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 w-full">
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-6 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Multi-Tenant Link in Bio Platform</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Everything you are. <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              In one simple link.
            </span>
          </h1>

          <p className="text-slate-600 text-base sm:text-lg mt-4 sm:mt-6 leading-relaxed max-w-xl mx-auto">
            Join invited creators who share their links, social media, custom themes, and scannable QR codes on a single verified profile.
          </p>
        </div>

        {/* Claim Form Container */}
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl border border-slate-100 max-w-xl mx-auto">
          <HeroForm />
        </div>

        {/* Value Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 sm:mt-16 max-w-3xl mx-auto">
          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 mx-auto sm:mx-0">
              <FontAwesomeIcon icon={faPaintBrush} className="text-sm" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">8 Curated Themes</h3>
            <p className="text-xs text-slate-500 mt-1">Preset styling with guaranteed contrast & fast rendering.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 mx-auto sm:mx-0">
              <FontAwesomeIcon icon={faQrcode} className="text-sm" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Instant QR Codes</h3>
            <p className="text-xs text-slate-500 mt-1">Export 1024px print-ready QR codes for physical sharing.</p>
          </div>

          <div className="bg-white/60 backdrop-blur-xs p-4 rounded-xl border border-slate-200/80 text-center sm:text-left">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 mx-auto sm:mx-0">
              <FontAwesomeIcon icon={faChartLine} className="text-sm" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Real-Time Analytics</h3>
            <p className="text-xs text-slate-500 mt-1">Track views, link click rankings, devices, and top referrers.</p>
          </div>
        </div>
      </section>
    </div>
  );
}