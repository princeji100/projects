/**
 * Canonical Plan Registry and Feature Key Definitions
 * Centralized authority for plan tiers and monetization feature capabilities.
 * 
 * Pure, environment-neutral configuration module.
 * Contains ZERO pricing, payment provider keys, database schemas, or UI dependencies.
 */

export const PLAN_IDS = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
});

export const FEATURE_KEYS = Object.freeze({
  REMOVE_BRANDING: 'remove_branding',
  EXTENDED_ANALYTICS: 'extended_analytics',
  CUSTOM_DOMAIN: 'custom_domain',
  MULTIPLE_PROFILES: 'multiple_profiles',
  ADVANCED_SEO: 'advanced_seo',
});

export const VALID_PLAN_IDS = Object.freeze(new Set(Object.values(PLAN_IDS)));
export const VALID_FEATURE_KEYS = Object.freeze(new Set(Object.values(FEATURE_KEYS)));

export const PLANS = Object.freeze({
  [PLAN_IDS.FREE]: Object.freeze({
    id: PLAN_IDS.FREE,
    name: 'Free',
    features: Object.freeze({
      [FEATURE_KEYS.REMOVE_BRANDING]: false,
      [FEATURE_KEYS.EXTENDED_ANALYTICS]: false,
      [FEATURE_KEYS.CUSTOM_DOMAIN]: false,
      [FEATURE_KEYS.MULTIPLE_PROFILES]: false,
      [FEATURE_KEYS.ADVANCED_SEO]: false,
    }),
  }),
  [PLAN_IDS.PRO]: Object.freeze({
    id: PLAN_IDS.PRO,
    name: 'Pro',
    features: Object.freeze({
      [FEATURE_KEYS.REMOVE_BRANDING]: true,
      [FEATURE_KEYS.EXTENDED_ANALYTICS]: true,
      [FEATURE_KEYS.CUSTOM_DOMAIN]: true,
      [FEATURE_KEYS.MULTIPLE_PROFILES]: true,
      [FEATURE_KEYS.ADVANCED_SEO]: true,
    }),
  }),
});

/**
 * Validates whether a plan identifier is recognized.
 *
 * @param {string | null | undefined} planId
 * @returns {boolean}
 */
export function isValidPlan(planId) {
  if (!planId || typeof planId !== 'string') return false;
  return VALID_PLAN_IDS.has(planId.trim().toLowerCase());
}

/**
 * Validates whether a feature key is recognized.
 *
 * @param {string | null | undefined} featureKey
 * @returns {boolean}
 */
export function isValidFeature(featureKey) {
  if (!featureKey || typeof featureKey !== 'string') return false;
  return VALID_FEATURE_KEYS.has(featureKey.trim().toLowerCase());
}
