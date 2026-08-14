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
    <nav aria-label="Dashboard navigation" className="flex flex-col items-center justify-between h-full w-full py-2">
      {/* Top Nav Items */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              title={item.label}
              className={`flex flex-col items-center justify-center w-15 h-15 rounded-2xl transition-all duration-150 group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                isActive
                  ? 'text-blue-600 bg-blue-50 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium'
              }`}
            >
              <FontAwesomeIcon
                icon={item.icon}
                className={`text-base mb-1 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-700'}`}
              />
              <span className={`text-[10px] leading-tight tracking-tight ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-800'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Nav Items */}
      <div className="flex flex-col items-center gap-1.5 w-full px-2 pt-4 border-t border-slate-100 mt-auto">
        {/* Help icon */}
        <button
          type="button"
          title="Help & Support"
          className="flex flex-col items-center justify-center w-15 h-13 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer group"
        >
          <FontAwesomeIcon icon={faQuestionCircle} className="text-base mb-0.5" />
          <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-600">Help</span>
        </button>

        {/* Logout icon */}
        <button
          type="button"
          onClick={() => signOut()}
          title="Sign Out"
          className="flex flex-col items-center justify-center w-15 h-13 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer group"
        >
          <FontAwesomeIcon icon={faRightFromBracket} className="text-base mb-0.5 group-hover:text-red-500" />
          <span className="text-[10px] font-medium text-slate-400 group-hover:text-red-600">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default AppSidebar;