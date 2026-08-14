'use client';
import Link from "next/link";
import LogoutButton from "./buttons/LogoutButton";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';
import { useSession } from "next-auth/react";

import LinktreeLogo from "./media/LinktreeLogo";

const Header = () => {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="max-w-5xl flex justify-between items-center mx-auto px-4 sm:px-6 py-3">
        <div className="flex gap-4 sm:gap-6 items-center">
          <Link 
            href={'/'} 
            className="hover:opacity-85 transition-opacity focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none rounded-lg p-1"
          >
            <LinktreeLogo />
          </Link>
          <nav className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Link 
              href={'/about'} 
              className="px-3 py-2 rounded-lg hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              About
            </Link>
          </nav>
        </div>

        <nav className="flex items-center gap-2 sm:gap-3 text-sm">
          {session ? (
            <div className="flex items-center gap-3">
              <Link 
                href={'/account'} 
                className="hidden sm:inline-flex px-3.5 py-2 font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Dashboard
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                href={'/login'}
                className="px-3.5 py-2 min-h-[44px] flex items-center font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href={'/login'}
                className="px-4 py-2 min-h-[44px] flex items-center font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-all active:scale-95"
              >
                Create Account
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;