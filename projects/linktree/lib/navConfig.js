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
    { href: '/account', label: 'Settings', icon: faGear },
    { href: '/account/uploads', label: 'Uploads', icon: faImages },
    { href: '/account/analytics', label: 'Analytics', icon: faChartLine },
  ];

  if (isAdmin) {
    items.push({
      href: '/account/admin',
      label: 'Admin',
      icon: faUserShield,
      isAdmin: true,
    });
  }

  return items;
}
