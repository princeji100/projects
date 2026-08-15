/**
 * Centralized Analytics Range Policy & Metadata
 * 
 * Single source of truth for baseline (Free) and extended (Pro) analytics ranges.
 * Pure, database-independent, and safe for both server and client execution.
 */

export const ANALYTICS_RANGE_CONFIG = Object.freeze({
  '7d': Object.freeze({
    id: '7d',
    days: 7,
    label: '7 Days',
    printLabel: 'Last 7 Days',
    extended: false,
  }),
  '30d': Object.freeze({
    id: '30d',
    days: 30,
    label: '30 Days',
    printLabel: 'Last 30 Days',
    extended: false,
  }),
  '90d': Object.freeze({
    id: '90d',
    days: 90,
    label: '90 Days',
    printLabel: 'Last 90 Days',
    extended: true,
  }),
  '365d': Object.freeze({
    id: '365d',
    days: 365,
    label: '1 Year',
    printLabel: 'Last 1 Year',
    extended: true,
  }),
});

export const BASE_ANALYTICS_RANGES = Object.freeze(['7d', '30d']);
export const EXTENDED_ANALYTICS_RANGES = Object.freeze(['90d', '365d']);
export const ALL_ANALYTICS_RANGES = Object.freeze(['7d', '30d', '90d', '365d']);
export const DEFAULT_ANALYTICS_RANGE = '7d';

/**
 * Resolves an analytics range parameter according to user entitlement.
 * 
 * Rules:
 * - '7d' is always allowed -> '7d'
 * - '30d' is always allowed -> '30d'
 * - '90d' requires canUseExtended -> '90d' if allowed, else '30d'
 * - '365d' requires canUseExtended -> '365d' if allowed, else '30d'
 * - Unknown/missing -> DEFAULT_ANALYTICS_RANGE ('7d')
 *
 * @param {string | null | undefined} requestedRange
 * @param {boolean} [canUseExtended=false]
 * @returns {'7d' | '30d' | '90d' | '365d'}
 */
export function resolveAnalyticsRange(requestedRange, canUseExtended = false) {
  if (!requestedRange || typeof requestedRange !== 'string') {
    return DEFAULT_ANALYTICS_RANGE;
  }

  const normalized = requestedRange.trim().toLowerCase();

  if (normalized === '7d') {
    return '7d';
  }

  if (normalized === '30d') {
    return '30d';
  }

  if (normalized === '90d') {
    return canUseExtended ? '90d' : '30d';
  }

  if (normalized === '365d') {
    return canUseExtended ? '365d' : '30d';
  }

  return DEFAULT_ANALYTICS_RANGE;
}

/**
 * Retrieves the configuration object for a specific range ID.
 *
 * @param {string} rangeId
 * @returns {typeof ANALYTICS_RANGE_CONFIG['7d']}
 */
export function getAnalyticsRangeConfig(rangeId) {
  if (rangeId && ANALYTICS_RANGE_CONFIG[rangeId]) {
    return ANALYTICS_RANGE_CONFIG[rangeId];
  }
  return ANALYTICS_RANGE_CONFIG[DEFAULT_ANALYTICS_RANGE];
}

/**
 * Returns the exact number of days for a range ID.
 *
 * @param {string} rangeId
 * @returns {number}
 */
export function getAnalyticsRangeDays(rangeId) {
  return getAnalyticsRangeConfig(rangeId).days;
}
