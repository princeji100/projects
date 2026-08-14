import {
  faFileLines,
  faChartLine,
  faImages,
  faUserShield,
  faHouse,
  faLink,
  faPaintBrush,
  faGear,
} from '@fortawesome/free-solid-svg-icons';

/**
 * Single source of truth for authorized dashboard navigation items.
 * Icon-centric sidebar matching docs/screenshots/profile-settings.png
 *
 * @param {boolean} isAdmin
 * @returns {Array<{ href: string, label: string, icon: any, isAdmin?: boolean }>}
 */
export function getNavItems(isAdmin = false) {
  const items = [
    { href: '/dashboard', label: 'Dashboard', icon: faHouse },
    { href: '/dashboard/uploads', label: 'Uploads', icon: faImages },
    { href: '/dashboard/analytics', label: 'Analytics', icon: faChartLine },
  ];

  if (isAdmin) {
    items.push({
      href: '/dashboard/admin',
      label: 'Admin',
      icon: faUserShield,
      isAdmin: true,
    });
  }

  return items;
}
