'use client';

import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileLines,
  faChartLine,
  faLeftLong,
  faImages,
  faUserShield,
} from '@fortawesome/free-solid-svg-icons';
import LogoutButton from '@/components/buttons/LogoutButton';
import { usePathname } from 'next/navigation';

const AppSidebar = ({ isAdmin = false }) => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col text-slate-600 gap-2 mt-8">
      <Link
        href={'/account'}
        className={`flex gap-3 items-center px-4 py-2 rounded-xl transition-colors duration-200 
          hover:bg-slate-50 hover:text-blue-600 text-sm
          ${pathname === '/account' ? 'text-blue-600 bg-blue-50 font-medium' : ''}`}
      >
        <FontAwesomeIcon icon={faFileLines} className="w-4 text-center" />
        <span>My Page</span>
      </Link>

      <Link
        href={'/account/uploads'}
        className={`flex gap-3 items-center px-4 py-2 rounded-xl transition-colors duration-200 
          hover:bg-slate-50 hover:text-blue-600 text-sm
          ${pathname === '/account/uploads' ? 'text-blue-600 bg-blue-50 font-medium' : ''}`}
      >
        <FontAwesomeIcon icon={faImages} className="w-4 text-center" />
        <span>Uploads</span>
      </Link>

      <Link
        href={'/account/analytics'}
        className={`flex gap-3 items-center px-4 py-2 rounded-xl transition-colors duration-200 
          hover:bg-slate-50 hover:text-blue-600 text-sm
          ${pathname === '/account/analytics' ? 'text-blue-600 bg-blue-50 font-medium' : ''}`}
      >
        <FontAwesomeIcon icon={faChartLine} className="w-4 text-center" />
        <span>Analytics</span>
      </Link>

      {/* D-02: Admin link is conditionally rendered based on ADMIN_EMAIL */}
      {isAdmin && (
        <Link
          href={'/account/admin'}
          className={`flex gap-3 items-center px-4 py-2 rounded-xl transition-colors duration-200 
            hover:bg-slate-50 hover:text-blue-600 text-sm
            ${pathname === '/account/admin' ? 'text-blue-600 bg-blue-50 font-medium' : ''}`}
        >
          <FontAwesomeIcon icon={faUserShield} className="w-4 text-center text-blue-500" />
          <span>Admin</span>
        </Link>
      )}

      <div className="mt-4">
        <LogoutButton />
      </div>

      <Link
        href={'/'}
        className="flex gap-3 items-center px-4 py-2 mt-4 border-t border-slate-100 pt-6
          text-slate-600 hover:text-blue-600 transition-colors duration-200 text-sm"
      >
        <FontAwesomeIcon icon={faLeftLong} className="w-4 text-center" />
        <span>Back to website</span>
      </Link>
    </nav>
  );
};

export default AppSidebar;