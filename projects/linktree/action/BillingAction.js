'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/connectToDB';
import User from '@/models/User';
import {
  getSubscriptionByUserId,
  saveRazorpayPendingSubscriptionByUserId,
  markRazorpayAuthorizationVerified,
  setSubscriptionCancelAtPeriodEnd,
  normalizeUserId,
} from '@/lib/subscriptionRepository';
import {
  getRazorpayConfig,
  createRazorpaySubscription,
  verifyRazorpaySubscriptionSignature,
  cancelRazorpaySubscriptionAtPeriodEnd,
} from '@/lib/billing/providers/razorpay';
import { PRODUCT_NAME } from '@/lib/brand';

/**
 * Creates or retrieves a safe Razorpay test subscription checkout payload for the authenticated user.
 *
 * Invariants:
 * - Operates strictly under session.user.id authority (zero client-supplied userId/amount/plan).
 * - Enforces existing-state protections (blocks manual Pro, blocks Stripe, blocks active Razorpay).
 * - Reuses existing pending Razorpay subscription ID when available to prevent duplicate provider subscriptions.
 * - Blocks repeat checkout if authorization is already verified and awaiting activation.
 * - Saves normalized pending state (status: 'incomplete', plan: 'pro') via repository.
 * - Never returns key secret, plan ID, or raw subscription entity to the client.
 *
 * @returns {Promise<{ success: boolean, keyId?: string, subscriptionId?: string, error?: string, message?: string }>}
 */
export async function createRazorpayTestCheckoutAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
      message: 'You must be signed in to access billing features.',
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

    // D. Safe reuse of existing pending Razorpay subscription ID (or block if already verified)
    if (
      existingSub.provider === 'razorpay' &&
      existingSub.status === 'incomplete' &&
      existingSub.providerSubscriptionId &&
      typeof existingSub.providerSubscriptionId === 'string' &&
      existingSub.providerSubscriptionId.startsWith('sub_')
    ) {
      if (existingSub.providerAuthorizationVerifiedAt) {
        return {
          success: false,
          error: 'AUTHORIZATION_ALREADY_VERIFIED',
          message: 'Payment authorization has already been verified and is awaiting activation.',
        };
      }

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
  } catch (dbErr) {
    return {
      success: false,
      error: dbErr.code || 'SUBSCRIPTION_SAVE_FAILED',
      message: 'Failed to record pending subscription state.',
    };
  }

  // 6. Return minimal checkout client configuration
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
 * Server action to verify Razorpay checkout client response.
 *
 * Invariants:
 * - Operates strictly on authenticated session.user.id.
 * - Validates signature using server-only RAZORPAY_KEY_SECRET.
 * - Stores providerAuthorizationVerifiedAt timestamp upon cryptographic verification.
 * - Keeps local Subscription status strictly 'incomplete' (fail-closed).
 * - Authoritative 'active' status is deferred to verified webhook event intake.
 *
 * @param {Object} params
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_subscription_id
 * @param {string} params.razorpay_signature
 * @returns {Promise<{ success: boolean, verified: boolean, message?: string, error?: string }>}
 */
export async function verifyRazorpayTestCheckoutAction(params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      verified: false,
      error: 'UNAUTHORIZED',
      message: 'You must be signed in to verify payment.',
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

  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  } = params || {};

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

  // Persist providerAuthorizationVerifiedAt timestamp upon successful checkout signature verification
  await markRazorpayAuthorizationVerified(normalizedUserId);

  // NOTE: Local subscription status remains 'incomplete'.
  // Authoritative 'active' status is deferred to webhook processing.

  return {
    success: true,
    verified: true,
    message:
      'Test authorisation verified. Subscription lifecycle activation will be confirmed by webhook.',
  };
}

/**
 * Cancels the authenticated user's active Razorpay Pro subscription at the end of the current billing cycle.
 *
 * Invariants:
 * - Operates strictly under session.user.id authority (zero client-supplied parameters).
 * - Enforces strict eligibility: must have active Razorpay subscription with cancelAtPeriodEnd != true.
 * - Always calls Razorpay cancel endpoint with cancel_at_cycle_end: true (never immediate).
 * - Persists local cancelAtPeriodEnd: true while maintaining active status and Pro entitlements.
 * - Returns sanitized presentation message.
 *
 * @returns {Promise<{ success: boolean, cancelAtPeriodEnd?: boolean, message?: string, error?: string }>}
 */
export async function cancelRazorpayAtPeriodEndAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      success: false,
      error: 'UNAUTHORIZED',
      message: 'You must be signed in to manage your subscription.',
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

  const sub = await getSubscriptionByUserId(normalizedUserId);
  if (!sub) {
    return {
      success: false,
      error: 'NO_PAID_SUBSCRIPTION',
      message: 'No subscription found for your account.',
    };
  }

  if (sub.provider === 'manual') {
    return {
      success: false,
      error: 'MANUAL_SUBSCRIPTION',
      message: 'Manual Pro grants cannot be cancelled via payment provider.',
    };
  }

  if (sub.provider === 'stripe') {
    return {
      success: false,
      error: 'PROVIDER_MANAGED_ELSEWHERE',
      message: 'Your subscription is managed through another payment provider.',
    };
  }

  if (sub.provider !== 'razorpay') {
    return {
      success: false,
      error: 'UNSUPPORTED_PROVIDER',
      message: 'Unsupported subscription provider.',
    };
  }

  if (sub.status === 'incomplete') {
    return {
      success: false,
      error: 'SUBSCRIPTION_INCOMPLETE',
      message: 'Your subscription setup is incomplete.',
    };
  }

  if (sub.status === 'canceled' || sub.status === 'expired') {
    return {
      success: false,
      error: 'SUBSCRIPTION_ALREADY_ENDED',
      message: 'Your subscription has already ended.',
    };
  }

  if (sub.status === 'past_due' || sub.status === 'paused') {
    return {
      success: false,
      error: 'SUBSCRIPTION_NOT_ACTIVE',
      message: 'Only active subscriptions can be cancelled.',
    };
  }

  if (sub.status !== 'active') {
    return {
      success: false,
      error: 'SUBSCRIPTION_NOT_ACTIVE',
      message: 'Only active subscriptions can be cancelled.',
    };
  }

  if (sub.cancelAtPeriodEnd) {
    return {
      success: true,
      cancelAtPeriodEnd: true,
      message: 'Cancellation has already been scheduled for the end of your billing cycle.',
    };
  }

  if (!sub.providerSubscriptionId || typeof sub.providerSubscriptionId !== 'string' || !sub.providerSubscriptionId.startsWith('sub_')) {
    return {
      success: false,
      error: 'INVALID_PROVIDER_SUBSCRIPTION_ID',
      message: 'Subscription record is missing a valid provider identifier.',
    };
  }

  // 1. Call Razorpay API to schedule cancellation at cycle end
  let cancelRes;
  try {
    cancelRes = await cancelRazorpaySubscriptionAtPeriodEnd(sub.providerSubscriptionId);
  } catch (apiErr) {
    return {
      success: false,
      error: apiErr.code || 'RAZORPAY_CANCEL_FAILED',
      message: apiErr.message || 'Failed to schedule cancellation with payment provider.',
    };
  }

  // 2. Persist local cancellation marker
  try {
    await setSubscriptionCancelAtPeriodEnd(normalizedUserId, {
      currentPeriodStart: cancelRes.currentPeriodStart,
      currentPeriodEnd: cancelRes.currentPeriodEnd,
    });
  } catch (dbErr) {
    // Known operational reconciliation edge case: provider accepted, local update failed
    return {
      success: false,
      error: 'CANCELLATION_SYNC_PENDING',
      message:
        'Cancellation was scheduled with payment provider, but local database synchronization is pending. Your access remains intact.',
    };
  }

  return {
    success: true,
    cancelAtPeriodEnd: true,
    message:
      'Your subscription cancellation has been scheduled for the end of your billing cycle. Pro capabilities remain active until your paid period ends.',
  };
}
