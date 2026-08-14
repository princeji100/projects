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
    <nav aria-label="Dashboard navigation" className="flex flex-col items-center gap-1 w-full">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-150 group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              isActive
                ? 'text-blue-600 bg-blue-50 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FontAwesomeIcon
              icon={item.icon}
              className={`text-base mb-1 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`}
            />
            <span className={`text-[10px] font-semibold leading-tight ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-800'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}

      {/* Spacer to push bottom items down */}
      <div className="flex-1 min-h-8" />

      {/* Help icon */}
      <button
        type="button"
        className="flex flex-col items-center justify-center w-16 h-14 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
        title="Help"
      >
        <FontAwesomeIcon icon={faQuestionCircle} className="text-base mb-1" />
      </button>

      {/* Logout icon */}
      <button
        type="button"
        onClick={() => signOut()}
        className="flex flex-col items-center justify-center w-16 h-14 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
        title="Logout"
      >
        <FontAwesomeIcon icon={faRightFromBracket} className="text-base mb-1" />
        <span className="text-[10px] font-semibold leading-tight">Logout</span>
      </button>
    </nav>
  );
};

export default AppSidebar;