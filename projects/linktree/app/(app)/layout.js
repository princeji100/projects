import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SafeImage from "@/components/media/SafeImage";
import AppSidebar from "@/components/layout/AppSidebar";
import MobileNavBar from "@/components/layout/MobileNavBar";
import LogoutButton from "@/components/buttons/LogoutButton";
import { ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink, faUser, faShareNodes } from "@fortawesome/free-solid-svg-icons";
import Page from "@/models/Page";
import Link from "next/link";
import connectToDatabase from "@/lib/connectToDB";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: `Account Dashboard`,
  description: "Manage your Linktree profile and links",
};

export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return redirect('/login');
  }
  
  await connectToDatabase();
  const page = await Page.findOne({ owner: session?.user?.email });
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()?.trim();
  const isAdmin = Boolean(session?.user?.email && adminEmail && session.user.email.toLowerCase().trim() === adminEmail);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 text-slate-900`}>
        <SessionWrapper>
          <ToastContainer 
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
          />

          {/* ═══ Desktop Top Header Bar ═══ */}
          <header className="hidden md:flex sticky top-0 z-40 bg-white border-b border-slate-200 px-6 h-16 items-center justify-between shadow-xs">
            {/* Left: Brand + Page Title */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-slate-900 hover:opacity-80 transition-opacity">
                <span className="text-emerald-500 text-xl">✦</span>
                <span className="font-extrabold text-lg tracking-tight">Linktree</span>
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <h1 className="text-base font-semibold text-slate-700">Settings</h1>
            </div>

            {/* Right: Avatar + Share */}
            <div className="flex items-center gap-3">
              {page?.uri && (
                <Link
                  href={`/${page.uri}`}
                  target="_blank"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-full transition-all shadow-xs active:scale-95"
                >
                  <FontAwesomeIcon icon={faShareNodes} className="text-xs" />
                  <span>Share</span>
                </Link>
              )}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="rounded-full bg-slate-100 overflow-hidden w-9 h-9 ring-1 ring-slate-200 shrink-0 flex items-center justify-center">
                  <SafeImage 
                    src={session?.user?.image} 
                    width={36} 
                    height={36} 
                    alt={session?.user?.name || 'User avatar'}
                    className="object-cover object-center w-full h-full"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                        <FontAwesomeIcon icon={faUser} className="text-sm" />
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </header>

          {/* ═══ Mobile Top Bar ═══ */}
          <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="flex items-center gap-1.5">
                <span className="text-emerald-500 text-lg">✦</span>
                <span className="font-extrabold text-base tracking-tight text-slate-900">Linktree</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {page?.uri && (
                <Link
                  href={`/${page.uri}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-full shadow-xs active:scale-95"
                >
                  <FontAwesomeIcon icon={faShareNodes} className="text-[10px]" />
                  <span>Share</span>
                </Link>
              )}
              <div className="rounded-full bg-slate-100 overflow-hidden w-8 h-8 ring-1 ring-slate-200 flex items-center justify-center">
                <SafeImage 
                  src={session?.user?.image} 
                  width={32} 
                  height={32} 
                  alt={session?.user?.name || 'User avatar'}
                  className="object-cover object-center w-full h-full"
                  fallback={
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                      <FontAwesomeIcon icon={faUser} className="text-xs" />
                    </div>
                  }
                />
              </div>
            </div>
          </header>

          <main className="md:flex min-h-[calc(100vh-4rem)]">
            {/* ═══ Desktop Icon Sidebar (matching screenshot) ═══ */}
            <aside className="hidden md:flex flex-col items-center bg-white border-r border-slate-200 w-20 py-6 shrink-0 shadow-xs">
              <div className="sticky top-22 flex flex-col items-center gap-1 flex-1">
                {/* User Avatar at top of sidebar */}
                <div className="rounded-full bg-slate-100 overflow-hidden w-12 h-12 ring-2 ring-slate-200 flex items-center justify-center shadow-xs mb-4">
                  <SafeImage 
                    src={session?.user?.image} 
                    width={48} 
                    height={48} 
                    alt={session?.user?.name || 'User avatar'}
                    className="object-cover object-center w-full h-full"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                        <FontAwesomeIcon icon={faUser} className="text-base" />
                      </div>
                    }
                  />
                </div>
                {page?.uri && (
                  <Link 
                    href={`/${page.uri}`} 
                    target="_blank" 
                    className="text-[9px] text-slate-400 hover:text-blue-600 transition-colors font-medium mb-4 truncate max-w-[72px] text-center"
                  >
                    @{page.uri}
                  </Link>
                )}

                <AppSidebar isAdmin={isAdmin} />
              </div>
            </aside>

            {/* ═══ Main Content Area ═══ */}
            <div className="grow min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
              {children}
            </div>
          </main>

          {/* ═══ Mobile Bottom Navigation Bar ═══ */}
          <MobileNavBar isAdmin={isAdmin} />
        </SessionWrapper>
      </body>
    </html>
  );
}