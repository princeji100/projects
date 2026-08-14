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
import PageTitle from "@/components/layout/PageTitle";
import LinktreeLogo from "@/components/media/LinktreeLogo";
import UserNavDropdown from "@/components/layout/UserNavDropdown";
import HeaderShareButton from "@/components/buttons/HeaderShareButton";
import { getPublicProfileUrl } from "@/lib/siteUrl";

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
  const publicUrl = getPublicProfileUrl(page?.uri);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}>
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
              <Link href="/" className="hover:opacity-85 transition-opacity focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-lg p-1">
                <LinktreeLogo />
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <PageTitle isAdmin={isAdmin} />
            </div>

            {/* Right: Share + Avatar Dropdown */}
            <div className="flex items-center gap-3">
              <HeaderShareButton
                uri={page?.uri}
                publicUrl={publicUrl}
                size="md"
              />
              <div className="flex items-center pl-2 border-l border-slate-200">
                <UserNavDropdown
                  user={session?.user}
                  uri={page?.uri}
                  publicUrl={publicUrl}
                  isAdmin={isAdmin}
                  size="md"
                />
              </div>
            </div>
          </header>

          {/* ═══ Mobile Top Bar ═══ */}
          <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <Link href="/" className="hover:opacity-85 transition-opacity focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-lg p-1">
                <LinktreeLogo boxSize="w-7 h-7" iconSize="text-xs" textSize="text-base" />
              </Link>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <HeaderShareButton
                uri={page?.uri}
                publicUrl={publicUrl}
                size="sm"
              />
              <UserNavDropdown
                user={session?.user}
                uri={page?.uri}
                publicUrl={publicUrl}
                isAdmin={isAdmin}
                size="sm"
              />
            </div>
          </header>

          <main className="md:flex min-h-[calc(100vh-4rem)]">
            {/* ═══ Desktop Icon Sidebar (matching screenshot) ═══ */}
            <aside className="hidden md:flex flex-col items-center bg-white border-r border-slate-200 w-64 py-6 shrink-0 shadow-xs">
              <div className="sticky top-22 flex flex-col items-center gap-1 flex-1 w-full">
                {/* User Avatar at top of sidebar */}
                <div className="rounded-full bg-slate-100 overflow-hidden w-16 h-16 ring-2 ring-slate-200 flex items-center justify-center shadow-xs mb-3">
                  <SafeImage 
                    src={session?.user?.image} 
                    width={64} 
                    height={64} 
                    alt={session?.user?.name || 'User avatar'}
                    className="object-cover object-center w-full h-full"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                        <FontAwesomeIcon icon={faUser} className="text-2xl" />
                      </div>
                    }
                  />
                </div>
                {page?.uri && (
                  <Link 
                    href={`/${page.uri}`} 
                    target="_blank" 
                    className="text-xs text-slate-400 hover:text-blue-600 transition-colors font-medium mb-4 truncate max-w-[200px] text-center"
                  >
                    @{page.uri}
                  </Link>
                )}

                <AppSidebar isAdmin={isAdmin} />
              </div>
            </aside>

            {/* ═══ Main Content Area ═══ */}
            <div className="grow min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
              <div className="max-w-[1200px] mx-auto">
                {children}
              </div>
            </div>
          </main>

          {/* ═══ Mobile Bottom Navigation Bar ═══ */}
          <MobileNavBar isAdmin={isAdmin} />
        </SessionWrapper>
      </body>
    </html>
  );
}