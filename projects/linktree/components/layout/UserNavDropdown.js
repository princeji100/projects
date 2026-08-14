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
  faComments,
} from '@fortawesome/free-solid-svg-icons';
import SafeImage from '@/components/media/SafeImage';
import FeedbackModal from '@/components/feedback/FeedbackModal';

export default function UserNavDropdown({ user, uri, isAdmin = false, size = 'md' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
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
          <div className="px-4 py-3 border-b border-slate-100">
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
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/80 hover:bg-blue-100/80 px-2.5 py-1.5 rounded-lg transition-colors w-full justify-between"
              >
                <span>View live profile</span>
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px]" />
              </Link>
            )}
          </div>

          {/* Admin Control Center Link for Admin */}
          {isAdmin && (
            <div className="p-1 border-b border-slate-100">
              <Link
                href="/dashboard/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
              >
                <FontAwesomeIcon icon={faUserShield} className="w-4 text-center text-amber-600" />
                <span>Admin Control Center</span>
              </Link>
            </div>
          )}

          {/* Feedback & Bug Report for All Users */}
          <div className="p-1 border-b border-slate-100">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                setIsFeedbackOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <FontAwesomeIcon icon={faComments} className="w-4 text-center text-purple-600" />
              <span>Feedback &amp; Bug Report</span>
            </button>
          </div>

          {/* Logout Action */}
          <div className="p-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="w-4 text-center text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Feedback Modal */}
      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
      />
    </div>
  );
}
