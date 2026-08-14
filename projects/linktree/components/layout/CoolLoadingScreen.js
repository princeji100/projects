'use client';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLink } from '@fortawesome/free-solid-svg-icons';

export default function CoolLoadingScreen({ message = 'Loading...', fullScreen = false }) {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-md'
    : 'min-h-[380px] w-full flex flex-col items-center justify-center py-16 px-4';

  return (
    <div className={containerClasses} aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center max-w-xs text-center space-y-5">
        {/* Animated Brand Pulse Logo */}
        <div className="relative flex items-center justify-center">
          {/* Outer glowing aura rings */}
          <div className="absolute w-20 h-20 rounded-2xl bg-blue-500/15 animate-ping duration-1000" />
          <div className="absolute w-16 h-16 rounded-2xl bg-blue-600/20 blur-md animate-pulse" />
          
          {/* Core Brand Box */}
          <div className="relative w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transform transition-transform duration-300">
            <FontAwesomeIcon icon={faLink} className="text-xl animate-bounce duration-700" />
          </div>
        </div>

        {/* Text & Shimmer Progress Bar */}
        <div className="space-y-2.5 w-full flex flex-col items-center">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 tracking-tight text-base">
            <span>linktree</span>
          </div>

          <p className="text-xs font-medium text-slate-500">
            {message}
          </p>

          {/* Shimmer loading bar */}
          <div className="w-36 h-1.5 bg-slate-200/80 rounded-full overflow-hidden relative shadow-inner">
            <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-[shimmer_1.4s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
}
