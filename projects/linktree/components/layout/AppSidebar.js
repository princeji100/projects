'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLeftLong } from '@fortawesome/free-solid-svg-icons';
import LogoutButton from '@/components/buttons/LogoutButton';
import { usePathname } from 'next/navigation';
import { getNavItems } from '@/lib/navConfig';

const AppSidebar = ({ isAdmin = false }) => {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);

  return (
    <nav aria-label="Dashboard navigation" className="flex flex-col text-slate-600 gap-1.5 mt-6">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl transition-all duration-150 text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              isActive
                ? 'text-blue-600 bg-blue-50/80 shadow-xs font-semibold'
                : 'hover:bg-slate-50 hover:text-slate-900 text-slate-600'
            }`}
          >
            <FontAwesomeIcon
              icon={item.icon}
              className={`w-4 text-center ${item.isAdmin ? 'text-blue-500' : ''}`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <div className="mt-4 pt-2">
        <LogoutButton />
      </div>

      <Link
        href={'/'}
        className="flex items-center gap-3 px-4 py-3 min-h-[44px] mt-3 border-t border-slate-100 pt-4
          text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
      >
        <FontAwesomeIcon icon={faLeftLong} className="w-4 text-center" />
        <span>Back to website</span>
      </Link>
    </nav>
  );
};

export default AppSidebar;