import crypto from 'node:crypto';

/**
 * Razorpay Configuration & Adapter Layer (Wave 10 Test Mode)
 *
 * Invariants:
 * - Hard stop: strictly requires test key starting with 'rzp_test_'.
 * - Rejects any 'rzp_live_' key in Wave 10.
 * - Pricing authority is server-side plan ID from process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID.
 * - Never leaks key secret or authorization headers in client responses or error messages.
 */

export const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1';

/**
 * Validates and retrieves current Razorpay provider configuration.
 *
 * @param {Object} [env=process.env]
 * @returns {{ keyId: string, keySecret: string, planId: string }}
 */
export function getRazorpayConfig(env = process.env) {
  const keyId = env?.RAZORPAY_KEY_ID?.trim();
  const keySecret = env?.RAZORPAY_KEY_SECRET?.trim();
  const planId = env?.RAZORPAY_PRO_MONTHLY_PLAN_ID?.trim();

  if (!keyId || !keySecret || !planId) {
    const err = new Error('Razorpay configuration is incomplete. Missing required billing environment variables.');
    err.code = 'RAZORPAY_CONFIG_MISSING';
    throw err;
  }

  if (keyId.startsWith('rzp_live_')) {
    const err = new Error('Live Razorpay keys are rejected in Wave 10 test mode.');
    err.code = 'RAZORPAY_LIVE_MODE_REJECTED';
    throw err;
  }

  if (!keyId.startsWith('rzp_test_')) {
    const err = new Error('Razorpay Key ID must be a test mode key starting with "rzp_test_".');
    err.code = 'RAZORPAY_TEST_MODE_REQUIRED';
    throw err;
  }

  if (!planId.startsWith('plan_')) {
    const err = new Error('Invalid Razorpay plan ID format. Expected ID starting with "plan_".');
    err.code = 'RAZORPAY_INVALID_PLAN_ID';
    throw err;
  }

  return {
    keyId,
    keySecret,
    planId,
  };
}

/**
 * Creates a Razorpay Subscription for an authenticated user.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated User._id string
 * @param {number} [params.totalCount=1200] - Technical recurring count limit
 * @param {number} [params.quantity=1]
 * @param {Function} [params.fetchFn=fetch]
 * @param {Object} [params.env=process.env]
 * @returns {Promise<{ subscriptionId: string, status: string, planId: string }>}
 */
export async function createRazorpaySubscription({
  userId,
  totalCount = 1200,
  quantity = 1,
  fetchFn = fetch,
  env = process.env,
}) {
  if (!userId || typeof userId !== 'string') {
    const err = new Error('Valid user ID is required to create a subscription');
    err.code = 'INVALID_USER_ID';
    throw err;
  }

  const config = getRazorpayConfig(env);
  const authHeader = `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`;

  const requestPayload = {
    plan_id: config.planId,
    total_count: totalCount,
    quantity,
    notes: {
      prince_links_user_id: String(userId),
      prince_links_product: 'pro_monthly',
    },
  };

  let res;
  try {
    res = await fetchFn(`${RAZORPAY_API_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (netErr) {
    const err = new Error('Failed to communicate with Razorpay payment service');
    err.code = 'RAZORPAY_NETWORK_ERROR';
    err.originalMessage = netErr.message;
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    const err = new Error('Malformed non-JSON response received from payment provider');
    err.code = 'RAZORPAY_RESPONSE_MALFORMED';
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data?.error?.description || 'Razorpay subscription creation failed');
    err.code = 'RAZORPAY_API_ERROR';
    err.status = res.status;
    err.providerErrorCode = data?.error?.code;
    throw err;
  }

  if (!data || typeof data !== 'object' || typeof data.id !== 'string' || !data.id.startsWith('sub_')) {
    const err = new Error('Invalid subscription response received from Razorpay');
    err.code = 'RAZORPAY_RESPONSE_INVALID';
    throw err;
  }

  if (data.plan_id !== config.planId) {
    const err = new Error('Returned subscription plan ID does not match requested plan');
    err.code = 'RAZORPAY_PLAN_MISMATCH';
    throw err;
  }

  return {
    subscriptionId: data.id,
    status: data.status || 'created',
    planId: data.plan_id,
  };
}

/**
 * Verifies the authenticity of a Razorpay Subscription checkout payment signature.
 * Uses HMAC-SHA256 with timing-safe comparison.
 *
 * Signature Contract:
 * HMAC_SHA256(razorpay_payment_id + "|" + subscription_id, key_secret)
 *
 * @param {Object} params
 * @param {string} params.paymentId - razorpay_payment_id
 * @param {string} params.subscriptionId - expected local providerSubscriptionId
 * @param {string} params.signature - razorpay_signature
 * @param {string} [params.secret] - Optional secret override
 * @param {Object} [params.env=process.env]
 * @returns {boolean}
 */
export function verifyRazorpaySubscriptionSignature({
  paymentId,
  subscriptionId,
  signature,
  secret,
  env = process.env,
}) {
  if (
    !paymentId ||
    typeof paymentId !== 'string' ||
    !subscriptionId ||
    typeof subscriptionId !== 'string' ||
    !signature ||
    typeof signature !== 'string'
  ) {
    return false;
  }

  let keySecret = secret;
  if (!keySecret) {
    try {
      const config = getRazorpayConfig(env);
      keySecret = config.keySecret;
    } catch {
      return false;
    }
  }

  const payload = `${paymentId.trim()}|${subscriptionId.trim()}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  const incomingBuffer = Buffer.from(signature.trim(), 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(incomingBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Requests scheduled cancellation at the end of the current billing cycle for a Razorpay Subscription.
 *
 * Invariants:
 * - Hard commercial policy: always enforces cancel_at_cycle_end = true (never immediate).
 * - Key ID must start with 'rzp_test_' (rejects 'rzp_live_').
 * - Validates provider subscription ID format (sub_...).
 * - Uses Basic Auth with server-only key secret.
 * - Validates response object, matching subscription ID and expected plan ID.
 *
 * @param {string} providerSubscriptionId - Razorpay Subscription ID (sub_...)
 * @param {Object} [options]
 * @param {Function} [options.fetchFn=fetch]
 * @param {Object} [options.env=process.env]
 * @returns {Promise<{ subscriptionId: string, status: string, planId: string, cancelAtCycleEnd: boolean, currentPeriodStart?: Date, currentPeriodEnd?: Date }>}
 */
export async function cancelRazorpaySubscriptionAtPeriodEnd(
  providerSubscriptionId,
  options = {}
) {
  if (
    !providerSubscriptionId ||
    typeof providerSubscriptionId !== 'string' ||
    !providerSubscriptionId.trim().startsWith('sub_')
  ) {
    const err = new Error('Valid Razorpay subscription ID is required to cancel');
    err.code = 'INVALID_PROVIDER_SUBSCRIPTION_ID';
    throw err;
  }

  const cleanSubId = providerSubscriptionId.trim();
  const env = options.env || process.env;
  const config = getRazorpayConfig(env);
  const fetchFn = options.fetchFn || fetch;

  const authHeader = `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`;

  // Hard commercial policy invariant: always cancel at cycle end
  const requestPayload = {
    cancel_at_cycle_end: true,
  };

  let res;
  try {
    res = await fetchFn(`${RAZORPAY_API_BASE_URL}/subscriptions/${cleanSubId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(requestPayload),
    });
  } catch (netErr) {
    const err = new Error('Failed to communicate with Razorpay payment service');
    err.code = 'RAZORPAY_NETWORK_ERROR';
    err.originalMessage = netErr.message;
    throw err;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    const err = new Error('Malformed non-JSON response received from payment provider');
    err.code = 'RAZORPAY_RESPONSE_MALFORMED';
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err = new Error(data?.error?.description || 'Razorpay subscription cancellation failed');
    err.code = 'RAZORPAY_API_ERROR';
    err.status = res.status;
    err.providerErrorCode = data?.error?.code;
    throw err;
  }

  if (!data || typeof data !== 'object' || typeof data.id !== 'string' || !data.id.startsWith('sub_')) {
    const err = new Error('Invalid subscription response received from Razorpay');
    err.code = 'RAZORPAY_RESPONSE_INVALID';
    throw err;
  }

  if (data.id !== cleanSubId) {
    const err = new Error('Returned subscription ID does not match requested cancellation ID');
    err.code = 'RAZORPAY_SUBSCRIPTION_MISMATCH';
    throw err;
  }

  if (data.plan_id && data.plan_id !== config.planId) {
    const err = new Error('Returned subscription plan ID does not match expected Pro plan');
    err.code = 'RAZORPAY_PLAN_MISMATCH';
    throw err;
  }

  let currentPeriodStart;
  if (typeof data.current_start === 'number' && !isNaN(data.current_start) && data.current_start > 0) {
    currentPeriodStart = new Date(data.current_start * 1000);
  }

  let currentPeriodEnd;
  if (typeof data.current_end === 'number' && !isNaN(data.current_end) && data.current_end > 0) {
    currentPeriodEnd = new Date(data.current_end * 1000);
  }

  return {
    subscriptionId: data.id,
    status: data.status || 'active',
    planId: data.plan_id || config.planId,
    cancelAtCycleEnd: true,
    currentPeriodStart,
    currentPeriodEnd,
  };
}
