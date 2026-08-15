'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRocket, faSpinner, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { createRazorpayTestCheckoutAction, verifyRazorpayTestCheckoutAction } from '@/action/BillingAction';

/**
 * Loads the standard Razorpay checkout script on demand.
 * Avoids global script inclusion across non-billing pages.
 */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Razorpay Test Subscription Checkout Button (Wave 10)
 *
 * Invariants:
 * - Operates strictly in Razorpay Test Mode.
 * - Receives subscription authority from server (never supplies plan ID or amount from client).
 * - Verifies payment signature on server.
 * - Displays verified test authorization state (does not claim active Pro).
 */
export default function RazorpayTestCheckoutButton({ onVerified, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleStartCheckout = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Request safe test checkout data from server
      const checkoutRes = await createRazorpayTestCheckoutAction();
      if (!checkoutRes.success) {
        setErrorMsg(checkoutRes.message || 'Failed to initialize checkout.');
        setLoading(false);
        return;
      }

      // 2. Dynamically load official standard checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof window.Razorpay !== 'function') {
        setErrorMsg('Unable to load payment SDK. Please check your network connection.');
        setLoading(false);
        return;
      }

      // 3. Open Razorpay Standard Checkout modal
      const options = {
        key: checkoutRes.keyId,
        subscription_id: checkoutRes.subscriptionId,
        name: checkoutRes.productName,
        description: checkoutRes.description,
        prefill: {
          name: checkoutRes.customer?.name || '',
          email: checkoutRes.customer?.email || '',
        },
        theme: {
          color: '#2563EB',
        },
        handler: async function (response) {
          try {
            const verifyRes = await verifyRazorpayTestCheckoutAction({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success && verifyRes.verified) {
              if (typeof onVerified === 'function') {
                onVerified(verifyRes.message);
              }
            } else {
              setErrorMsg(verifyRes.message || 'Payment signature verification failed.');
            }
          } catch {
            setErrorMsg('An error occurred while verifying the transaction signature.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setErrorMsg('Unexpected error starting test checkout.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2 w-full">
      <button
        type="button"
        onClick={handleStartCheckout}
        disabled={disabled || loading}
        className={`w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-none ${
          disabled || loading
            ? 'bg-blue-600/50 text-white/80 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white shadow-lg shadow-blue-600/30 cursor-pointer'
        }`}
      >
        {loading ? (
          <>
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
            <span>Initializing Test Checkout...</span>
          </>
        ) : (
          <>
            <FontAwesomeIcon icon={faRocket} className="text-xs" />
            <span>Test Pro Checkout</span>
          </>
        )}
      </button>

      {errorMsg && (
        <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold mt-1">
          <FontAwesomeIcon icon={faCircleExclamation} className="text-xs shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
