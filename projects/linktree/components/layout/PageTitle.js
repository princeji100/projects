'use client';

import { usePathname } from 'next/navigation';
import { getNavItems } from '@/lib/navConfig';

export default function PageTitle({ isAdmin = false }) {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);
  
  const currentItem = navItems.find((item) => item.href === pathname);
  const title = currentItem ? currentItem.label : 'Settings';

  return <h1 className="text-base font-semibold text-slate-700">{title}</h1>;
}
