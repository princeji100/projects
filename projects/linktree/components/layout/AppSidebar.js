'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightFromBracket, faArrowLeft, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { usePathname } from 'next/navigation';
import { getNavItems } from '@/lib/navConfig';
import { signOut } from 'next-auth/react';

/**
 * Icon-centric vertical sidebar matching docs/screenshots/profile-settings.png
 * Narrow width, icon + small label below each icon
 */
const AppSidebar = ({ isAdmin = false }) => {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);

  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col gap-1 w-full px-3">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl transition-all duration-150 font-medium group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              isActive
                ? 'text-blue-700 bg-blue-50 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FontAwesomeIcon
              icon={item.icon}
              className={`text-base w-5 text-center ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}
            />
            <span className="text-sm">{item.label}</span>
          </Link>
        );
      })}

      <div className="my-2 border-t border-slate-100" />

      {/* Help icon */}
      <button
        type="button"
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all cursor-pointer font-medium text-sm text-left"
      >
        <FontAwesomeIcon icon={faQuestionCircle} className="text-base w-5 text-center text-slate-400" />
        <span>Help & Support</span>
      </button>

      {/* Logout icon */}
      <button
        type="button"
        onClick={() => signOut()}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer font-medium text-sm text-left"
      >
        <FontAwesomeIcon icon={faRightFromBracket} className="text-base w-5 text-center text-slate-400 group-hover:text-red-500" />
        <span>Logout</span>
      </button>
    </nav>
  );
};

export default AppSidebar;