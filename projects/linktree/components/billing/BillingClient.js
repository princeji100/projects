'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faCrown,
  faRocket,
  faInfoCircle,
  faCircleCheck,
  faClock,
  faXmark,
  faShieldHalved,
  faFlask,
} from '@fortawesome/free-solid-svg-icons';
import { FREE_BASELINE_FEATURES, PRO_ROADMAP_FEATURES } from '@/lib/billingPresentation';
import RazorpayTestCheckoutButton from './RazorpayTestCheckoutButton';

/**
 * Interactive Billing and Plan Comparison Component
 * Displays current plan status, comparison cards, and Razorpay test checkout integration.
 */
export default function BillingClient({ presentation }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState(null);
  const isPro = presentation?.isPro ?? false;
  const isManualPro = presentation?.isManualPro ?? false;

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ═══ Current Plan Status Banner ═══ */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Plan
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  presentation.statusVariant === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : presentation.statusVariant === 'indigo'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : presentation.statusVariant === 'amber'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {presentation.statusBadge}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {presentation.displayStatus}
            </h2>
            <p className="text-sm text-slate-500">
              {isPro
                ? (isManualPro
                    ? 'Manual Pro access is active on your account.'
                    : 'Your account has full access to all available Pro capabilities.')
                : 'You are currently on the Free plan with complete access to all baseline creator tools.'}
            </p>
          </div>

          {presentation.periodEndLabel && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 text-left sm:text-right shrink-0">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                {presentation.cancelAtPeriodEnd ? 'Access Valid Until' : 'Renewal / Period End'}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {presentation.periodEndLabel}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Plan Comparison Grid ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* ─── Free Plan Card ─── */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                  Standard Tier
                </span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">Free</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Full access to the baseline Prince Links creator toolkit
                </p>
              </div>
              {!isPro && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1 rounded-full">
                  Active
                </span>
              )}
            </div>

            <div className="py-2 border-y border-slate-100">
              <span className="text-3xl font-black text-slate-900">Free</span>
              <span className="text-xs font-medium text-slate-400 block mt-0.5">
                Always included for all registered creators
              </span>
            </div>

            {/* Feature List */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Included Core Features
              </span>
              <ul className="space-y-2.5">
                {FREE_BASELINE_FEATURES.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                    <FontAwesomeIcon icon={faCheck} className="text-emerald-500 text-xs mt-0.5 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-slate-100">
            <button
              type="button"
              disabled={!isPro}
              className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all ${
                !isPro
                  ? 'bg-slate-100 text-slate-500 cursor-default'
                  : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
              }`}
            >
              {!isPro ? 'Current Plan' : 'Switch to Free'}
            </button>
          </div>
        </div>

        {/* ─── Pro Plan Card ─── */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden border border-slate-800">
          {/* Subtle Glow Backdrop */}
          <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-6 relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <FontAwesomeIcon icon={faCrown} className="text-xs" />
                  <span>Premium Tier</span>
                </div>
                <h3 className="text-2xl font-black text-white mt-1">Pro</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Advanced monetization and brand customization capabilities
                </p>
              </div>
              {isPro ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold px-3 py-1 rounded-full">
                  {isManualPro ? 'Manual Grant' : 'Active'}
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <FontAwesomeIcon icon={faFlask} className="text-[10px]" />
                  <span>Test Mode</span>
                </span>
              )}
            </div>

            {/* Test Mode Notice Banner */}
            {!isPro && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-300 text-xs">
                  <FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
                  <span>Razorpay Test Mode</span>
                </div>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  No real money will be charged. Use Razorpay test cards/methods to test recurring subscription creation.
                </p>
              </div>
            )}

            {/* Price Box */}
            <div className="py-2 border-y border-white/10 flex items-baseline justify-between">
              <div>
                <span className="text-3xl font-black text-white">₹149</span>
                <span className="text-xs font-semibold text-slate-400"> / month</span>
              </div>
              {!isPro && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Recurring Billing
                </span>
              )}
            </div>

            {/* Feature List */}
            <div className="space-y-3.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Pro Capabilities &amp; Roadmap
              </span>
              <ul className="space-y-3">
                {PRO_ROADMAP_FEATURES.map((item) => (
                  <li key={item.key} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCircleCheck} className="text-blue-400 text-xs shrink-0" />
                        <span className="text-xs font-bold text-slate-100">{item.title}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.statusVariant === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/10 text-slate-300 border border-white/10'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-5 leading-relaxed">
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Verified Post-Authorisation State Notice */}
            {verifiedMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-emerald-300 text-xs">
                  <FontAwesomeIcon icon={faCircleCheck} className="text-xs" />
                  <span>Test Authorisation Verified</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  {verifiedMessage}
                </p>
              </div>
            )}
          </div>

          <div className="pt-8 mt-6 border-t border-white/10 relative z-10">
            {isPro ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default"
              >
                {isManualPro ? 'Manual Pro Active' : 'Pro Plan Active'}
              </button>
            ) : isManualPro ? (
              <button
                type="button"
                disabled
                className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed"
              >
                Manual Pro access is already active
              </button>
            ) : (
              <RazorpayTestCheckoutButton
                onVerified={(msg) => setVerifiedMessage(msg)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ═══ Informational Launch Modal ═══ */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close modal"
              className="absolute right-5 top-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FontAwesomeIcon icon={faRocket} className="text-xl" />
            </div>

            <div className="space-y-2">
              <h3 id="modal-title" className="text-xl font-extrabold text-slate-900">
                Pro Subscriptions Launching Soon
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                We are currently establishing our automated subscription and billing infrastructure.
                No payment is collected at this time.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <FontAwesomeIcon icon={faShieldHalved} className="text-blue-500" />
                <span>Free Baseline Continuity</span>
              </div>
              <p className="leading-relaxed">
                All existing v2.0 features (tip jars, rich embeds, typography, themes, analytics) remain permanently available for free.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
