'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import handleFormSubmit from '@/action/grabusername';
import UserNameFormResult from '@/components/formResults/UserNameFormResult';
import SubmitButton from '../buttons/SubmitButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faLink,
  faCheckCircle,
  faShieldHalved,
  faPaintBrush,
  faGlobe,
} from '@fortawesome/free-solid-svg-icons';
import { validateUsername } from '@/lib/username';

const UserNameForm = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [name, setName] = useState(searchParams.get('Choiceusername') || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [hostPrefix, setHostPrefix] = useState('links.princeji.com/');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.host) {
      setHostPrefix(`${window.location.host}/`);
    }
  }, []);

  const suggestions = ['portfolio', 'creator', 'design', 'developer', 'official'];

  const onSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    const valid = validateUsername(cleanName);
    if (!valid.ok) {
      setErrorMessage(valid.error);
      return;
    }

    const formdata = new FormData();
    formdata.set('username', cleanName);

    try {
      const result = await handleFormSubmit(formdata);
      if (result?.success) {
        // Refresh & push to dashboard to trigger page reload
        window.location.href = '/dashboard?created=' + encodeURIComponent(cleanName);
      } else {
        setErrorMessage(result?.error || 'Username is not available');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center items-center py-10 px-4">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

      <div className="bg-white p-7 sm:p-10 rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/90 text-center max-w-lg w-full space-y-6 relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* Top Glowing Icon */}
        <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto text-2xl shadow-lg shadow-blue-500/25">
          <FontAwesomeIcon icon={faLink} />
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Claim Your Unique Handle
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Choose your permanent profile URL. This will be the direct link where your audience finds all your links, themes, and content.
          </p>
        </div>

        {/* Live URL Display Card */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-center gap-1.5 text-xs text-slate-500 font-mono">
          <FontAwesomeIcon icon={faGlobe} className="text-slate-400 text-xs" />
          <span>{hostPrefix}</span>
          <span className="text-blue-600 font-bold underline font-mono">
            {name || 'yourname'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <div className="flex items-center border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all shadow-inner">
              <span className="bg-slate-100/90 text-slate-500 py-3.5 px-3 border-r border-slate-200 text-xs font-mono select-none truncate max-w-[190px] sm:max-w-[220px]" title={hostPrefix}>
                {hostPrefix}
              </span>
              <input
                className="flex-1 px-3 py-3.5 bg-white text-slate-900 font-bold text-sm focus:outline-none min-h-[48px]"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                  if (errorMessage) setErrorMessage('');
                }}
                type="text"
                name="username"
                placeholder="yourname"
                spellCheck={false}
                autoComplete="off"
                required
              />
            </div>

            {errorMessage && (
              <div className="mt-2.5">
                <UserNameFormResult message={errorMessage} />
              </div>
            )}
          </div>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Try:</span>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setName(s);
                  if (errorMessage) setErrorMessage('');
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200/80 rounded-lg text-[11px] font-mono text-slate-600 transition-colors cursor-pointer"
              >
                +{s}
              </button>
            ))}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <SubmitButton className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all">
              <span>Activate Profile URL</span>
              <FontAwesomeIcon icon={faArrowRight} className="text-xs" />
            </SubmitButton>
          </div>
        </form>

        {/* Feature Assurance Highlights */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] font-semibold text-slate-500">
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" />
            <span>Instant Setup</span>
          </div>
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faPaintBrush} className="text-blue-500" />
            <span>8+ Themes</span>
          </div>
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faShieldHalved} className="text-indigo-500" />
            <span>Start Free</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNameForm;