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
import { faLink, faUser } from "@fortawesome/free-solid-svg-icons";
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}>
        <SessionWrapper>
          <ToastContainer 
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
          />

          {/* Mobile Top Bar */}
          <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
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
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{session?.user?.name || 'Account'}</p>
                {page?.uri && (
                  <Link 
                    href={`/${page.uri}`} 
                    target="_blank" 
                    className="text-[11px] text-blue-600 font-medium hover:underline flex items-center gap-1 truncate"
                  >
                    <FontAwesomeIcon icon={faLink} className="text-[9px]" />
                    <span>/{page.uri}</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="shrink-0 scale-90 origin-right">
              <LogoutButton />
            </div>
          </header>

          <main className="md:flex min-h-screen">
            {/* Desktop Left Sidebar */}
            <aside className="hidden md:block bg-white shadow-xs w-64 p-5 py-8 border-r border-slate-200 shrink-0">
              <div className="sticky top-6">
                <div className="rounded-full bg-slate-100 overflow-hidden w-[88px] h-[88px] mx-auto ring-2 ring-slate-200 flex items-center justify-center shadow-xs">
                  <SafeImage 
                    src={session?.user?.image} 
                    width={88} 
                    height={88} 
                    alt={session?.user?.name || 'User avatar'}
                    className="object-cover object-center w-full h-full"
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                        <FontAwesomeIcon icon={faUser} className="text-3xl" />
                      </div>
                    }
                  />
                </div>

                <div className="text-center mt-3">
                  <h2 className="text-sm font-bold text-slate-800 truncate px-2">{session?.user?.name}</h2>
                  {page && (
                    <Link 
                      href={`/${page.uri}`} 
                      target="_blank" 
                      className="inline-flex items-center gap-1.5 mt-1 text-xs text-slate-500 hover:text-blue-600 transition-colors font-medium"
                    >
                      <FontAwesomeIcon className="text-blue-500 text-[10px]" icon={faLink} />
                      <span className="text-slate-300">/</span>
                      <span className="underline truncate max-w-[150px]">{page.uri}</span>
                    </Link>
                  )}
                </div>

                <AppSidebar isAdmin={isAdmin} />
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="grow min-w-0 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Navigation Bar */}
          <MobileNavBar isAdmin={isAdmin} />
        </SessionWrapper>
      </body>
    </html>
  );
}