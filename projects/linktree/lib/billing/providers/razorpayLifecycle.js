/**
 * Pure Razorpay Subscription Lifecycle Normalizer (Wave 11B)
 *
 * Invariants:
 * - Pure, deterministic, provider-specific business logic.
 * - ZERO database queries, NextAuth dependencies, or environment secrets.
 * - Maps Razorpay provider subscription states and webhook events to canonical Prince Links Subscription statuses.
 */

/**
 * Provider status string mapping to canonical local Subscription status.
 *
 * Canonical mapping:
 * - created       -> incomplete
 * - authenticated -> incomplete
 * - active        -> active
 * - pending       -> past_due
 * - halted        -> past_due
 * - paused        -> paused
 * - cancelled     -> canceled
 * - completed     -> expired
 * - expired       -> expired
 *
 * @param {string} [providerStatus]
 * @returns {'incomplete' | 'active' | 'past_due' | 'paused' | 'canceled' | 'expired' | null}
 */
export function normalizeRazorpaySubscriptionStatus(providerStatus) {
  if (!providerStatus || typeof providerStatus !== 'string') {
    return null;
  }

  const clean = providerStatus.trim().toLowerCase();
  switch (clean) {
    case 'created':
    case 'authenticated':
      return 'incomplete';
    case 'active':
      return 'active';
    case 'pending':
    case 'halted':
      return 'past_due';
    case 'paused':
      return 'paused';
    case 'cancelled':
    case 'canceled':
      return 'canceled';
    case 'completed':
    case 'expired':
      return 'expired';
    default:
      return null;
  }
}

/**
 * Safely extracts Unix timestamps from subscription entity into validated Date objects.
 *
 * @param {Object} [subscriptionEntity]
 * @returns {{ currentPeriodStart: Date | undefined, currentPeriodEnd: Date | undefined }}
 */
export function extractRazorpayBillingPeriod(subscriptionEntity) {
  if (!subscriptionEntity || typeof subscriptionEntity !== 'object') {
    return { currentPeriodStart: undefined, currentPeriodEnd: undefined };
  }

  let currentPeriodStart;
  const startSec = subscriptionEntity.current_start;
  if (typeof startSec === 'number' && !isNaN(startSec) && startSec > 0 && isFinite(startSec)) {
    const d = new Date(startSec * 1000);
    if (!isNaN(d.getTime())) {
      currentPeriodStart = d;
    }
  }

  let currentPeriodEnd;
  const endSec = subscriptionEntity.current_end;
  if (typeof endSec === 'number' && !isNaN(endSec) && endSec > 0 && isFinite(endSec)) {
    const d = new Date(endSec * 1000);
    if (!isNaN(d.getTime())) {
      currentPeriodEnd = d;
    }
  }

  return { currentPeriodStart, currentPeriodEnd };
}

/**
 * Normalizes a verified incoming Razorpay Subscription lifecycle webhook event into
 * an atomic state instruction for persistence.
 *
 * @param {Object} params
 * @param {string} params.eventType - e.g. 'subscription.activated'
 * @param {Object} params.subscriptionEntity - payload.subscription.entity
 * @param {Date | number | string} [params.eventCreatedAt] - Provider event timestamp
 * @returns {Object} Normalized lifecycle snapshot
 */
export function normalizeRazorpayLifecycleEvent({
  eventType,
  subscriptionEntity,
  eventCreatedAt,
}) {
  if (!subscriptionEntity || typeof subscriptionEntity !== 'object') {
    return {
      isValid: false,
      error: 'MISSING_SUBSCRIPTION_ENTITY',
    };
  }

  const rawSubId = subscriptionEntity.id;
  if (typeof rawSubId !== 'string' || !rawSubId.trim().startsWith('sub_')) {
    return {
      isValid: false,
      error: 'INVALID_SUBSCRIPTION_ID',
    };
  }

  const providerSubscriptionId = rawSubId.trim();
  const rawStatus = typeof subscriptionEntity.status === 'string' ? subscriptionEntity.status.trim() : '';
  const mappedStatus = normalizeRazorpaySubscriptionStatus(rawStatus);

  // Normalize target status based on both event type and provider entity status
  let status;
  const cleanEventType = typeof eventType === 'string' ? eventType.trim() : '';

  switch (cleanEventType) {
    case 'subscription.authenticated':
      // 'authenticated' event does NOT grant Pro unless entity is already active
      status = mappedStatus === 'active' ? 'active' : 'incomplete';
      break;

    case 'subscription.activated':
      status = mappedStatus === 'active' ? 'active' : (mappedStatus || 'incomplete');
      break;

    case 'subscription.charged':
      // Charged event recovers past_due to active if entity is active
      status = mappedStatus === 'active' ? 'active' : (mappedStatus || 'active');
      break;

    case 'subscription.pending':
      status = 'past_due';
      break;

    case 'subscription.halted':
      status = 'past_due';
      break;

    case 'subscription.paused':
      status = 'paused';
      break;

    case 'subscription.resumed':
      // Resumed event with active entity restores active Pro status
      status = mappedStatus === 'active' ? 'active' : (mappedStatus || 'active');
      break;

    case 'subscription.cancelled':
      status = 'canceled';
      break;

    case 'subscription.completed':
      status = 'expired';
      break;

    case 'subscription.updated':
      // Updated represents metadata changes and does NOT independently alter status
      status = undefined;
      break;

    default:
      // Unknown event type fails closed (does not alter status)
      status = mappedStatus || undefined;
      break;
  }

  // Extract customer ID if present in standard Razorpay format (cust_...)
  let providerCustomerId;
  if (
    typeof subscriptionEntity.customer_id === 'string' &&
    subscriptionEntity.customer_id.trim().startsWith('cust_')
  ) {
    providerCustomerId = subscriptionEntity.customer_id.trim();
  }

  // Extract billing period
  const { currentPeriodStart, currentPeriodEnd } = extractRazorpayBillingPeriod(subscriptionEntity);

  // Extract provider event ordering timestamp
  let providerStateUpdatedAt;
  if (eventCreatedAt instanceof Date && !isNaN(eventCreatedAt.getTime())) {
    providerStateUpdatedAt = eventCreatedAt;
  } else if (typeof eventCreatedAt === 'number' && !isNaN(eventCreatedAt) && eventCreatedAt > 0) {
    providerStateUpdatedAt = new Date(eventCreatedAt > 1e11 ? eventCreatedAt : eventCreatedAt * 1000);
  } else if (typeof eventCreatedAt === 'string') {
    const d = new Date(eventCreatedAt);
    if (!isNaN(d.getTime())) {
      providerStateUpdatedAt = d;
    }
  }

  const isTerminal = status === 'canceled' || status === 'expired';

  return {
    isValid: true,
    eventType: cleanEventType,
    providerSubscriptionId,
    planId: subscriptionEntity.plan_id ? String(subscriptionEntity.plan_id).trim() : undefined,
    status,
    cancelAtPeriodEnd: isTerminal ? false : undefined,
    providerCustomerId,
    currentPeriodStart,
    currentPeriodEnd,
    providerStateUpdatedAt,
    isTerminal,
  };
}
