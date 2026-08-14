'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { usePathname } from 'next/navigation';
import { getNavItems } from '@/lib/navConfig';

/**
 * Mobile Bottom Navigation Bar
 * Consumes the exact same authorized getNavItems(isAdmin) as desktop sidebar.
 */
export default function MobileNavBar({ isAdmin = false }) {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg no-print"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-2 py-1 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
              isActive
                ? 'text-blue-600 font-semibold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <FontAwesomeIcon icon={item.icon} className="text-base mb-1" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
