'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/connectToDB';
import User from '@/models/User';
import {
  getSubscriptionByUserId,
  saveRazorpayPendingSubscriptionByUserId,
  normalizeUserId,
} from '@/lib/subscriptionRepository';
import {
  getRazorpayConfig,
  createRazorpaySubscription,
  verifyRazorpaySubscriptionSignature,
} from '@/lib/billing/providers/razorpay';
import { PRODUCT_NAME } from '@/lib/brand';

/**
 * Creates or retrieves a safe Razorpay test subscription checkout payload for the authenticated user.
 *
 * Invariants:
 * - Operates strictly under session.user.id authority (zero client-supplied userId/amount/plan).
 * - Enforces existing-state protections (blocks manual Pro, blocks Stripe, blocks active Razorpay).
 * - Reuses existing pending Razorpay subscription ID when available to prevent duplicate provider subscriptions.
 * - Persists normalized local pending state (plan: pro, status: incomplete, provider: razorpay).
 *
 * @returns {Promise<Object>} Safe client checkout payload
 */
export async function createRazorpayTestCheckoutAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'UNAUTHENTICATED',
      message: 'You must be signed in to start subscription checkout.',
    };
  }

  const normalizedUserId = normalizeUserId(session.user.id);
  if (!normalizedUserId) {
    return {
      success: false,
      error: 'INVALID_SESSION_USER',
      message: 'Invalid session user identity.',
    };
  }

  await connectToDatabase();

  // 1. Verify User exists in database
  const user = await User.findById(normalizedUserId).lean();
  if (!user) {
    return {
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'Account not found.',
    };
  }

  // 2. Validate Razorpay test configuration
  let config;
  try {
    config = getRazorpayConfig();
  } catch (cfgErr) {
    return {
      success: false,
      error: cfgErr.code || 'RAZORPAY_CONFIG_ERROR',
      message: cfgErr.message || 'Billing provider is not configured properly.',
    };
  }

  // 3. Inspect existing subscription for state protections
  const existingSub = await getSubscriptionByUserId(normalizedUserId);

  if (existingSub) {
    // A. Manual Pro protection
    if (existingSub.provider === 'manual' && existingSub.plan === 'pro' && existingSub.status === 'active') {
      return {
        success: false,
        error: 'MANUAL_PRO_ACTIVE',
        message: 'Manual Pro access is already active on your account.',
      };
    }

    // B. Stripe-managed protection
    if (existingSub.provider === 'stripe') {
      return {
        success: false,
        error: 'STRIPE_PROVIDER_MANAGED',
        message: 'Your subscription is managed by another payment provider.',
      };
    }

    // C. Razorpay active / trialing protection
    if (existingSub.provider === 'razorpay' && (existingSub.status === 'active' || existingSub.status === 'trialing')) {
      return {
        success: false,
        error: 'RAZORPAY_ALREADY_ACTIVE',
        message: 'A Razorpay Pro subscription is already active on your account.',
      };
    }

    // D. Safe reuse of existing pending Razorpay subscription ID
    if (
      existingSub.provider === 'razorpay' &&
      existingSub.status === 'incomplete' &&
      existingSub.providerSubscriptionId &&
      typeof existingSub.providerSubscriptionId === 'string' &&
      existingSub.providerSubscriptionId.startsWith('sub_')
    ) {
      return {
        success: true,
        keyId: config.keyId,
        subscriptionId: existingSub.providerSubscriptionId,
        productName: PRODUCT_NAME || 'Prince Links',
        description: 'Prince Links Pro — ₹149/month',
        customer: {
          name: session.user.name || '',
          email: session.user.email || '',
        },
      };
    }
  }

  // 4. Create new Razorpay Subscription
  let createdSub;
  try {
    createdSub = await createRazorpaySubscription({
      userId: normalizedUserId.toString(),
    });
  } catch (apiErr) {
    return {
      success: false,
      error: apiErr.code || 'RAZORPAY_CREATE_FAILED',
      message: apiErr.message || 'Failed to initialize subscription with payment provider.',
    };
  }

  // 5. Persist normalized pending subscription
  try {
    await saveRazorpayPendingSubscriptionByUserId(
      normalizedUserId,
      createdSub.subscriptionId
    );
  } catch {
    return {
      success: false,
      error: 'SUBSCRIPTION_SAVE_FAILED',
      message: 'Failed to record pending subscription state.',
    };
  }

  return {
    success: true,
    keyId: config.keyId,
    subscriptionId: createdSub.subscriptionId,
    productName: PRODUCT_NAME || 'Prince Links',
    description: 'Prince Links Pro — ₹149/month',
    customer: {
      name: session.user.name || '',
      email: session.user.email || '',
    },
  };
}

/**
 * Verifies Razorpay checkout payment authorization signature for the authenticated user.
 *
 * Invariants:
 * - Authenticates session.user.id.
 * - Compares incoming razorpay_subscription_id against local persisted providerSubscriptionId.
 * - Verifies HMAC-SHA256 signature using server-only secret.
 * - CRITICAL: Successful signature verification DOES NOT activate Pro in Wave 10. Status remains incomplete.
 *
 * @param {Object} payload
 * @param {string} payload.razorpay_payment_id
 * @param {string} payload.razorpay_subscription_id
 * @param {string} payload.razorpay_signature
 * @returns {Promise<{ success: boolean, verified: boolean, message: string, error?: string }>}
 */
export async function verifyRazorpayTestCheckoutAction({
  razorpay_payment_id,
  razorpay_subscription_id,
  razorpay_signature,
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      verified: false,
      error: 'UNAUTHENTICATED',
      message: 'You must be signed in to verify subscription authorization.',
    };
  }

  const normalizedUserId = normalizeUserId(session.user.id);
  if (!normalizedUserId) {
    return {
      success: false,
      verified: false,
      error: 'INVALID_SESSION_USER',
      message: 'Invalid session user identity.',
    };
  }

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return {
      success: false,
      verified: false,
      error: 'INVALID_PAYLOAD',
      message: 'Missing required payment verification parameters.',
    };
  }

  await connectToDatabase();

  const localSub = await getSubscriptionByUserId(normalizedUserId);
  if (!localSub || localSub.provider !== 'razorpay' || !localSub.providerSubscriptionId) {
    return {
      success: false,
      verified: false,
      error: 'NO_PENDING_SUBSCRIPTION',
      message: 'No matching pending subscription found for your account.',
    };
  }

  if (localSub.providerSubscriptionId !== razorpay_subscription_id.trim()) {
    return {
      success: false,
      verified: false,
      error: 'SUBSCRIPTION_MISMATCH',
      message: 'Subscription identifier does not match local account record.',
    };
  }

  const isValid = verifyRazorpaySubscriptionSignature({
    paymentId: razorpay_payment_id.trim(),
    subscriptionId: localSub.providerSubscriptionId,
    signature: razorpay_signature.trim(),
  });

  if (!isValid) {
    return {
      success: false,
      verified: false,
      error: 'INVALID_SIGNATURE',
      message: 'Payment signature could not be verified.',
    };
  }

  // NOTE (Wave 10): Local subscription status remains 'incomplete'.
  // Authoritative 'active' status is deferred to Wave 11 webhook processing.

  return {
    success: true,
    verified: true,
    message:
      'Test authorisation verified. Subscription lifecycle activation will be confirmed by webhook in the next integration step.',
  };
}
