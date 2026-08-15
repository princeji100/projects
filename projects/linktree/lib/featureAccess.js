/**
 * Server-Side Feature Access & Authorization Bridge
 * 
 * Bridges Subscription persistence with the pure Entitlement Engine.
 * Provides strict and fail-closed entitlement loaders, server enforcement helpers,
 * and client-safe capability projections.
 * 
 * Server-only module. Must NOT be imported into Client Components.
 */

import { getSubscriptionByUserId, normalizeUserId } from './subscriptionRepository.js';
import { resolveEntitlements, toClientFeatureFlags } from './entitlements.js';
import { FEATURE_KEYS, isValidFeature } from './plans.js';

/**
 * Controlled error thrown when a server operation requires an unentitled feature.
 */
export class FeatureAccessError extends Error {
  constructor(featureKey, message) {
    super(message || `Feature "${featureKey}" is not available on current plan`);
    this.name = 'FeatureAccessError';
    this.code = 'FEATURE_NOT_AVAILABLE';
    this.feature = typeof featureKey === 'string' ? featureKey.trim().toLowerCase() : '';
  }
}

/**
 * Loads and resolves the full entitlement snapshot for a given User ID.
 * Strict path: propagates repository/database errors to the caller.
 * 
 * Fails closed to Free for missing or malformed user IDs without querying MongoDB.
 *
 * @param {string | Object | null | undefined} userId - Authenticated user ID
 * @param {Object} [options]
 * @param {Date | string | number} [options.now] - Optional deterministic timestamp
 * @param {Function} [options.getSubscription] - Optional injected subscription fetcher for testing
 * @returns {Promise<{ plan: 'free' | 'pro', isPro: boolean, features: Record<string, boolean> }>}
 */
export async function getUserEntitlements(userId, options = {}) {
  const normalizedId = normalizeUserId(userId);
  if (!normalizedId) {
    return resolveEntitlements(null, options);
  }

  const fetcher = typeof options.getSubscription === 'function'
    ? options.getSubscription
    : getSubscriptionByUserId;

  const subscription = await fetcher(normalizedId);
  return resolveEntitlements(subscription, options);
}

/**
 * Safe fail-closed entitlement loader.
 * In case of database/infrastructure errors, catches the error and safely falls back to Free entitlements.
 *
 * @param {string | Object | null | undefined} userId
 * @param {Object} [options]
 * @param {Date | string | number} [options.now]
 * @param {Function} [options.onError] - Optional callback for error observability
 * @param {Function} [options.getSubscription]
 * @returns {Promise<{ plan: 'free' | 'pro', isPro: boolean, features: Record<string, boolean> }>}
 */
export async function getSafeUserEntitlements(userId, options = {}) {
  try {
    return await getUserEntitlements(userId, options);
  } catch (error) {
    if (typeof options.onError === 'function') {
      try {
        options.onError(error);
      } catch {
        // Suppress secondary error handler exceptions
      }
    }
    return resolveEntitlements(null, options);
  }
}

/**
 * Checks whether a user is entitled to a specific capability.
 * Returns a boolean without throwing.
 *
 * @param {string | Object | null | undefined} userId
 * @param {string} featureKey
 * @param {Object} [options]
 * @param {boolean} [options.strict] - If true, propagates DB errors instead of catching
 * @returns {Promise<boolean>}
 */
export async function userHasFeature(userId, featureKey, options = {}) {
  if (!featureKey || typeof featureKey !== 'string') {
    return false;
  }
  const normalizedKey = featureKey.trim().toLowerCase();
  if (!isValidFeature(normalizedKey)) {
    return false;
  }

  const entitlements = options.strict
    ? await getUserEntitlements(userId, options)
    : await getSafeUserEntitlements(userId, options);

  return Boolean(entitlements.features[normalizedKey]);
}

/**
 * Enforces feature capability on the server (for Server Actions and API Routes).
 * Throws FeatureAccessError if feature is not entitled or unknown.
 *
 * @param {string | Object | null | undefined} userId
 * @param {string} featureKey
 * @param {Object} [options]
 * @returns {Promise<{ plan: 'free' | 'pro', isPro: boolean, features: Record<string, boolean> }>}
 */
export async function requireUserFeature(userId, featureKey, options = {}) {
  if (!featureKey || typeof featureKey !== 'string' || !isValidFeature(featureKey)) {
    throw new FeatureAccessError(featureKey, `Unknown or invalid feature "${featureKey}"`);
  }

  const normalizedKey = featureKey.trim().toLowerCase();
  const entitlements = await getUserEntitlements(userId, options);

  if (!entitlements.features[normalizedKey]) {
    throw new FeatureAccessError(normalizedKey);
  }

  return entitlements;
}

/**
 * Convenience helper to resolve entitlements directly from an authenticated NextAuth session object.
 * Keys strictly on session.user.id (never email).
 *
 * @param {Object | null | undefined} session
 * @param {Object} [options]
 * @returns {Promise<{ plan: 'free' | 'pro', isPro: boolean, features: Record<string, boolean> }>}
 */
export async function getSessionEntitlements(session, options = {}) {
  const userId = session?.user?.id;
  return getUserEntitlements(userId, options);
}

/**
 * Resolves safe client feature flags for a given user.
 * Strips all plan strings, IDs, dates, and billing records.
 *
 * @param {string | Object | null | undefined} userId
 * @param {Object} [options]
 * @returns {Promise<Record<string, boolean>>}
 */
export async function getClientFeatureFlags(userId, options = {}) {
  const entitlements = await getSafeUserEntitlements(userId, options);
  return toClientFeatureFlags(entitlements);
}
