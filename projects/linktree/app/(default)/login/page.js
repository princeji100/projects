'use client';

import LoginWithGoogle from '@/components/buttons/LoginWithGoogle';
import RequestInviteForm from '@/components/forms/RequestInviteForm';
import { useSession } from 'next-auth/react';
import { redirect, useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLock,
  faShieldHalved,
  faEnvelope,
  faSparkles,
  faUserPlus,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

const LoginContent = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [activeTab, setActiveTab] = useState(error === 'AccessDenied' ? 'request' : 'signin');

  useEffect(() => {
    if (error === 'AccessDenied') {
      setActiveTab('request');
    }
  }, [error]);

  return (
    <div className="space-y-6">
      {/* Access Denied Alert if redirected from NextAuth */}
      {error === 'AccessDenied' && (
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/90 text-amber-900 text-xs space-y-1 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
            <FontAwesomeIcon icon={faLock} className="text-amber-600" />
            <span>Invite Required for This Account</span>
          </div>
          <p className="leading-relaxed">
            Your Google account is not yet on the approved whitelist. Please submit an early access request below to get approved by the admin.
          </p>
        </div>
      )}

      {/* Segmented Auth Mode Switcher */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('signin')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'signin'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('request')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'request'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Request Invite
        </button>
      </div>

      {/* Mode 1: Sign In with Google */}
      {activeTab === 'signin' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Welcome Back</h2>
            <p className="text-xs text-slate-500">
              Sign in with your approved Google account to access your dashboard.
            </p>
          </div>

          <div className="pt-2">
            <LoginWithGoogle />
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Not whitelisted yet?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('request')}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Apply for early access &rarr;
              </button>
            </p>
          </div>
        </div>
      )}

      {/* Mode 2: Request Invite Application */}
      {activeTab === 'request' && (
        <div className="space-y-5 animate-in fade-in">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Apply for Creator Access</h2>
            <p className="text-xs text-slate-500">
              Submit your Google email to be reviewed and whitelisted by the admin.
            </p>
          </div>

          <RequestInviteForm />

          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already approved?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('signin')}
                className="font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Sign in directly &rarr;
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const Login = () => {
  const { data: session } = useSession();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Card Header */}
        <div className="bg-white p-7 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/90 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-xs">
              <FontAwesomeIcon icon={faShieldHalved} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Linktree Access Portal
            </h1>
            <p className="text-xs font-medium text-slate-500 max-w-xs mx-auto">
              Multi-Tenant Invite-Only Creator Platform
            </p>
          </div>

          <Suspense fallback={<div className="text-center py-8 text-xs text-slate-400">Loading...</div>}>
            <LoginContent />
          </Suspense>
        </div>

        {/* Footer Navigation */}
        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-800 transition">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;