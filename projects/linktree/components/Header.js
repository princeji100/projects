'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./buttons/LogoutButton";
import { useSession } from "next-auth/react";
import LinktreeLogo from "./media/LinktreeLogo";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowRight,
  faHouse,
  faCircleInfo,
  faArrowLeft,
  faRightToBracket,
} from "@fortawesome/free-solid-svg-icons";

const Header = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isLoginPage = pathname === '/login';
  const isAboutPage = pathname === '/about';
  const isHomePage = pathname === '/';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-5xl flex justify-between items-center mx-auto px-4 sm:px-6 py-3">
        {/* Left Side: Brand Logo & Navigation */}
        <div className="flex gap-4 sm:gap-6 items-center">
          <Link
            href={session ? '/dashboard' : '/'}
            className="hover:opacity-85 transition-opacity focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-xl p-1"
          >
            <LinktreeLogo />
          </Link>

          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-xl transition-colors text-xs font-semibold ${
                isHomePage
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Home
            </Link>
            <Link
              href="/about"
              className={`px-3 py-1.5 rounded-xl transition-colors text-xs font-semibold ${
                isAboutPage
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              About
            </Link>
          </nav>
        </div>

        {/* Right Side: Context-Aware Navigation Actions */}
        <nav className="flex items-center gap-2 sm:gap-3 text-xs font-semibold">
          {session ? (
            /* Logged-in session */
            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition-all"
              >
                <span>Dashboard</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
              </Link>
              <LogoutButton />
            </div>
          ) : isLoginPage ? (
            /* When on /login page */
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-[10px]" />
                <span>Home</span>
              </Link>
            </div>
          ) : (
            /* When on / or /about page */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-2 min-h-[38px] flex items-center font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[38px] font-bold bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl shadow-xs transition-all"
              >
                <span>Get Started</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-[10px]" />
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;