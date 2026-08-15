import crypto from 'node:crypto';

/**
 * Supported Razorpay Subscription Webhook Event Allowlist (Wave 11A)
 */
export const RAZORPAY_SUBSCRIPTION_EVENTS = Object.freeze([
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.completed',
  'subscription.updated',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.paused',
  'subscription.resumed',
]);

const SUPPORTED_EVENTS_SET = Object.freeze(new Set(RAZORPAY_SUBSCRIPTION_EVENTS));

/**
 * Checks if a given event type is a recognized Razorpay subscription event.
 *
 * @param {string} eventType
 * @returns {boolean}
 */
export function isSupportedRazorpaySubscriptionEvent(eventType) {
  if (typeof eventType !== 'string') return false;
  return SUPPORTED_EVENTS_SET.has(eventType.trim());
}

/**
 * Verifies the authenticity of an incoming Razorpay webhook request body.
 *
 * Signature Contract:
 * HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET) === x-razorpay-signature
 *
 * Invariants:
 * - Uses raw unparsed body text.
 * - Uses timing-safe string comparison.
 * - Does NOT use or mix with API Key Secret.
 * - Fails safely if webhook secret is missing.
 *
 * @param {Object} params
 * @param {string} params.rawBody - Raw unparsed request body string
 * @param {string} params.signature - x-razorpay-signature header value
 * @param {string} [params.secret] - Optional secret override (for testing)
 * @param {Object} [params.env=process.env]
 * @returns {boolean}
 */
export function verifyRazorpayWebhookSignature({
  rawBody,
  signature,
  secret,
  env = process.env,
}) {
  if (
    typeof rawBody !== 'string' ||
    !rawBody.length ||
    !signature ||
    typeof signature !== 'string'
  ) {
    return false;
  }

  const webhookSecret = secret || env?.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
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
 * Safely extracts minimal correlation metadata from a verified Razorpay webhook payload.
 * Note: Webhook event idempotency is strictly governed by the x-razorpay-event-id header,
 * not payload body fields.
 *
 * @param {Object} payload - Parsed JSON webhook payload
 * @returns {{ eventType: string, providerSubscriptionId: string | null, providerCreatedAt: Date | null }}
 */
export function extractWebhookSubscriptionMetadata(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      eventType: '',
      providerSubscriptionId: null,
      providerCreatedAt: null,
    };
  }

  const eventType = typeof payload.event === 'string' ? payload.event.trim() : '';

  // Razorpay subscription payload standard shape: payload.subscription.entity.id
  let providerSubscriptionId = null;
  const subEntity = payload?.payload?.subscription?.entity;
  if (subEntity && typeof subEntity.id === 'string' && subEntity.id.startsWith('sub_')) {
    providerSubscriptionId = subEntity.id.trim();
  }

  let providerCreatedAt = null;
  if (typeof payload.created_at === 'number' && !isNaN(payload.created_at)) {
    providerCreatedAt = new Date(payload.created_at * 1000);
  } else if (typeof subEntity?.created_at === 'number' && !isNaN(subEntity.created_at)) {
    providerCreatedAt = new Date(subEntity.created_at * 1000);
  }

  return {
    eventType,
    providerSubscriptionId,
    providerCreatedAt,
  };
}
