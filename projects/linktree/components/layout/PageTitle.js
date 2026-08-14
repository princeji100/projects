'use client';

import { usePathname } from 'next/navigation';
import { getNavItems } from '@/lib/navConfig';

export default function PageTitle({ isAdmin = false }) {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);
  
  const currentItem = navItems.find((item) => item.href === pathname);
  const title = currentItem ? currentItem.label : 'Dashboard';

  return <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>;
}
