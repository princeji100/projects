'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart,
  faQrcode,
  faCopy,
  faCheck,
  faXmark,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { buildUpiPaymentUri } from '@/lib/tipJar';

export default function PublicTipJar({
  tipJar,
  isLightText = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!tipJar || !tipJar.upiId) {
    return null;
  }

  const { upiId, name, amount, message } = tipJar;
  const upiPaymentUri = buildUpiPaymentUri({ upiId, name, amount, message });

  if (!upiPaymentUri) {
    return null;
  }

  const handleCopyUpi = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(upiId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
      }
    } catch {
      // Fallback
    }
  };

  const displayName = name || 'Creator';

  return (
    <>
      {/* Public Profile Tip Jar Trigger CTA */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Send a tip to ${displayName} via UPI`}
        className={`w-full max-w-xl mx-auto mb-4 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 border transition-all duration-200 cursor-pointer min-h-[52px] shadow-sm hover:scale-[1.01] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
          isLightText
            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40 text-white backdrop-blur-md'
            : 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-950 shadow-xs'
        } ${className}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0 shadow-xs">
            <FontAwesomeIcon icon={faHeart} className="text-xs text-rose-300" />
          </div>
          <div className="text-left min-w-0">
            <p className="text-xs sm:text-sm font-bold truncate">
              Support {displayName}
            </p>
            <p
              className={`text-[10px] sm:text-xs truncate ${
                isLightText ? 'text-white/80' : 'text-slate-600'
              }`}
            >
              {amount ? `Suggested Tip: ₹${amount} • UPI / QR` : 'Direct UPI Tips & QR'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
            <FontAwesomeIcon icon={faQrcode} className="text-[10px]" />
            <span>Tip</span>
          </span>
        </div>
      </button>

      {/* Accessible Tip Jar Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tipjar-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col items-center text-center space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close Tip Jar modal"
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <FontAwesomeIcon icon={faXmark} className="text-sm" />
            </button>

            {/* Modal Header */}
            <div className="space-y-1 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 text-lg shadow-inner">
                <FontAwesomeIcon icon={faHeart} className="text-rose-500" />
              </div>
              <h2
                id="tipjar-modal-title"
                className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight"
              >
                Support {displayName}
              </h2>
              {message && (
                <p className="text-xs text-slate-600 italic px-2 max-w-xs mx-auto">
                  &ldquo;{message}&rdquo;
                </p>
              )}
            </div>

            {/* Suggested Amount Pill if configured */}
            {amount && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs font-bold text-emerald-800">
                <span>Suggested Amount:</span>
                <span className="text-emerald-700 font-extrabold">₹{amount}</span>
              </div>
            )}

            {/* High-Contrast Scannable QR Code */}
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-200 shadow-inner flex flex-col items-center justify-center">
              <QRCodeSVG
                value={upiPaymentUri}
                size={180}
                level="M"
                includeMargin={true}
                fgColor="#000000"
                bgColor="#ffffff"
                aria-label="UPI Payment QR Code"
              />
              <p className="text-[10px] text-slate-400 font-medium mt-1.5">
                Scan with any UPI app (GPay, PhonePe, Paytm, BHIM, Cred)
              </p>
            </div>

            {/* Copy UPI ID Box */}
            <div className="w-full space-y-1.5 text-left">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block pl-1">
                UPI ID (VPA)
              </label>
              <div className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-mono text-xs sm:text-sm font-semibold text-slate-800 truncate select-all pr-2">
                  {upiId}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  aria-label="Copy UPI ID to clipboard"
                  className="shrink-0 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 min-h-[36px]"
                >
                  <FontAwesomeIcon
                    icon={copied ? faCheck : faCopy}
                    className={copied ? 'text-emerald-600' : 'text-slate-500'}
                  />
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Direct Open in UPI App CTA (Mobile Friendly) */}
            <div className="w-full space-y-2 pt-1">
              <a
                href={upiPaymentUri}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm active:scale-98 min-h-[44px]"
              >
                <span>Open in UPI App</span>
                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
              </a>

              {/* Strict Non-Verified Disclaimer */}
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight px-1">
                Payment is completed in your UPI app. This page does not verify or confirm the transaction.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
