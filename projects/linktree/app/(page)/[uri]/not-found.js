import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass, faArrowRight, faHome } from '@fortawesome/free-solid-svg-icons';

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6 bg-white/5 backdrop-blur-md p-8 sm:p-10 rounded-3xl border border-white/10 shadow-2xl">
        <div className="w-20 h-20 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-blue-500/20 shadow-inner">
          <FontAwesomeIcon icon={faCompass} className="text-3xl animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
            Profile Not Found
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The Linktree profile you are trying to visit does not exist, may have been renamed, or is waiting to be claimed.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-3 rounded-xl transition duration-200 shadow-lg shadow-blue-600/30"
          >
            <span>Create Your Own</span>
            <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-slate-300 text-sm font-medium px-5 py-3 rounded-xl transition duration-200"
          >
            <FontAwesomeIcon icon={faHome} className="text-xs" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
