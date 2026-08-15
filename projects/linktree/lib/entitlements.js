/**
 * Pure Subscription Entitlement Engine
 * Evaluates plan entitlements, feature access, and subscription status deterministically.
 * 
 * Pure, database-independent, provider-independent, and UI-neutral.
 * Contains ZERO database queries, NextAuth hooks, or environment secrets.
 */

import { PLAN_IDS, FEATURE_KEYS, PLANS, isValidFeature } from './plans.js';

export const ENTITLED_STATUSES = Object.freeze(new Set(['active', 'trialing']));
export const NON_ENTITLED_STATUSES = Object.freeze(new Set(['past_due', 'canceled', 'incomplete', 'expired']));

/**
 * Safely parses and validates a currentPeriodEnd date value.
 *
 * @param {Date | string | number | null | undefined} val
 * @returns {{ ok: boolean, date: Date | null }}
 */
function parsePeriodEndDate(val) {
  if (val === undefined || val === null || val === '') {
    return { ok: true, date: null };
  }
  if (val instanceof Date) {
    if (isNaN(val.getTime())) {
      return { ok: false, date: null };
    }
    return { ok: true, date: val };
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    if (isNaN(d.getTime())) {
      return { ok: false, date: null };
    }
    return { ok: true, date: d };
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) {
      return { ok: true, date: null };
    }
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      return { ok: false, date: null };
    }
    return { ok: true, date: d };
  }
  return { ok: false, date: null };
}

/**
 * Resolves the effective plan tier for a subscription record.
 * Fails closed to 'free' for missing, malformed, non-entitled, or expired subscriptions.
 *
 * @param {Object | null | undefined} subscription
 * @param {Object} [options]
 * @param {Date | string | number} [options.now] - Optional deterministic timestamp for expiration evaluation
 * @returns {'free' | 'pro'}
 */
export function getEffectivePlan(subscription, options = {}) {
  // 1. Missing or non-object subscription fails closed to Free
  if (!subscription || typeof subscription !== 'object' || Array.isArray(subscription)) {
    return PLAN_IDS.FREE;
  }

  // 2. Plan identification: only valid 'pro' plan is eligible for Pro entitlements
  const plan = typeof subscription.plan === 'string' ? subscription.plan.trim().toLowerCase() : '';
  if (plan !== PLAN_IDS.PRO) {
    return PLAN_IDS.FREE;
  }

  // 3. Status validation: must be 'active' or 'trialing'
  const status = typeof subscription.status === 'string' ? subscription.status.trim().toLowerCase() : '';
  if (!ENTITLED_STATUSES.has(status)) {
    return PLAN_IDS.FREE;
  }

  // 4. Expiration date check (if present)
  if (subscription.currentPeriodEnd !== undefined && subscription.currentPeriodEnd !== null && subscription.currentPeriodEnd !== '') {
    const parsedEnd = parsePeriodEndDate(subscription.currentPeriodEnd);
    if (!parsedEnd.ok) {
      // Malformed date fails closed to Free
      return PLAN_IDS.FREE;
    }

    if (parsedEnd.date !== null) {
      let now = options.now instanceof Date
        ? options.now
        : (options.now !== undefined && options.now !== null ? new Date(options.now) : new Date());

      if (isNaN(now.getTime())) {
        now = new Date();
      }

      // Expired: currentPeriodEnd <= now fails closed to Free
      if (parsedEnd.date.getTime() <= now.getTime()) {
        return PLAN_IDS.FREE;
      }
    }
  }

  // All Pro conditions satisfied
  return PLAN_IDS.PRO;
}

/**
 * Resolves the complete entitlement object for a subscription.
 *
 * @param {Object | null | undefined} subscription
 * @param {Object} [options]
 * @param {Date | string | number} [options.now]
 * @returns {{ plan: 'free' | 'pro', isPro: boolean, features: Record<string, boolean> }}
 */
export function resolveEntitlements(subscription, options = {}) {
  const effectivePlan = getEffectivePlan(subscription, options);
  const isPro = effectivePlan === PLAN_IDS.PRO;
  const planDef = PLANS[effectivePlan] || PLANS[PLAN_IDS.FREE];

  return {
    plan: effectivePlan,
    isPro,
    features: {
      [FEATURE_KEYS.REMOVE_BRANDING]: Boolean(planDef.features[FEATURE_KEYS.REMOVE_BRANDING]),
      [FEATURE_KEYS.EXTENDED_ANALYTICS]: Boolean(planDef.features[FEATURE_KEYS.EXTENDED_ANALYTICS]),
      [FEATURE_KEYS.CUSTOM_DOMAIN]: Boolean(planDef.features[FEATURE_KEYS.CUSTOM_DOMAIN]),
      [FEATURE_KEYS.MULTIPLE_PROFILES]: Boolean(planDef.features[FEATURE_KEYS.MULTIPLE_PROFILES]),
      [FEATURE_KEYS.ADVANCED_SEO]: Boolean(planDef.features[FEATURE_KEYS.ADVANCED_SEO]),
    },
  };
}

/**
 * Pure helper to check if a subscription is entitled to a specific feature key.
 *
 * @param {Object | null | undefined} subscription
 * @param {string} featureKey
 * @param {Object} [options]
 * @param {Date | string | number} [options.now]
 * @returns {boolean}
 */
export function hasFeature(subscription, featureKey, options = {}) {
  if (!featureKey || typeof featureKey !== 'string') {
    return false;
  }
  const normalizedKey = featureKey.trim().toLowerCase();
  if (!isValidFeature(normalizedKey)) {
    return false;
  }
  const entitlements = resolveEntitlements(subscription, options);
  return Boolean(entitlements.features[normalizedKey]);
}
