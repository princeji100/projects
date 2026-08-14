'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faGear,
  faImages,
  faChartLine,
  faUserShield,
  faArrowUpRightFromSquare,
  faRightFromBracket,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import SafeImage from '@/components/media/SafeImage';

export default function UserNavDropdown({ user, uri, isAdmin = false, size = 'md' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const avatarDimensions = size === 'sm' ? 32 : 36;
  const avatarClass = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button with Avatar and Chevron */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
        className="flex items-center gap-1.5 p-1 rounded-full hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer group"
      >
        <div className={`rounded-full bg-slate-100 overflow-hidden ${avatarClass} ring-1 ring-slate-200 shrink-0 flex items-center justify-center`}>
          <SafeImage
            src={user?.image}
            width={avatarDimensions}
            height={avatarDimensions}
            alt={user?.name || 'User avatar'}
            className="object-cover object-center w-full h-full"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                <FontAwesomeIcon icon={faUser} className={size === 'sm' ? 'text-xs' : 'text-sm'} />
              </div>
            }
          />
        </div>
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`text-[10px] text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Modal */}
      {isOpen && (
        <div 
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/80 border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* User Info Header */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900 truncate">
              {user?.name || 'My Account'}
            </p>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {user?.email || (uri ? `@${uri}` : '')}
            </p>
            {uri && (
              <Link
                href={`/${uri}`}
                target="_blank"
                onClick={() => setIsOpen(false)}
                className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>View public profile</span>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px]" />
              </Link>
            )}
          </div>

          {/* Navigation Links */}
          <div className="py-1">
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faGear} className="text-slate-400 w-4 text-center" />
              <span>Settings</span>
            </Link>

            <Link
              href="/account/uploads"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faImages} className="text-slate-400 w-4 text-center" />
              <span>Uploads & Media</span>
            </Link>

            <Link
              href="/account/analytics"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faChartLine} className="text-slate-400 w-4 text-center" />
              <span>Analytics</span>
            </Link>

            {isAdmin && (
              <Link
                href="/account/admin"
                role="menuitem"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-purple-700 hover:bg-purple-50 transition-colors"
              >
                <FontAwesomeIcon icon={faUserShield} className="text-purple-500 w-4 text-center" />
                <span>Admin Allowlist</span>
              </Link>
            )}
          </div>

          <div className="border-t border-slate-100 my-1" />

          {/* Logout Option */}
          <div className="px-1 py-0.5">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="w-4 text-center text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
