/**
 * Safe Billing & Plan Presentation Formatter
 * Prepares server-resolved entitlement snapshots for UI presentation.
 * 
 * Pure presentation layer.
 * Strips all internal identifiers, provider customer/subscription IDs, and billing secrets.
 */

import { toClientFeatureFlags } from './entitlements.js';

export const PRO_ROADMAP_FEATURES = Object.freeze([
  {
    key: 'remove_branding',
    title: 'Remove Platform Branding',
    description: 'Hide "Made with Linktree" badge and watermark on your public profile and preview.',
    status: 'Upcoming (Wave 7)',
    statusVariant: 'info',
  },
  {
    key: 'extended_analytics',
    title: 'Extended Analytics History',
    description: 'Access 90-day and 365-day engagement analytics, views, clicks, and trend insights.',
    status: 'Upcoming (Wave 8)',
    statusVariant: 'info',
  },
  {
    key: 'custom_domain',
    title: 'Custom Domain Mapping',
    description: 'Connect your own primary domain (e.g. yourname.com) directly to your profile.',
    status: 'Planned',
    statusVariant: 'slate',
  },
  {
    key: 'multiple_profiles',
    title: 'Multiple Profiles',
    description: 'Manage multiple independent creator pages under a single account.',
    status: 'Planned',
    statusVariant: 'slate',
  },
  {
    key: 'advanced_seo',
    title: 'Advanced SEO & Social Previews',
    description: 'Customize OpenGraph cards, search descriptions, and social metadata.',
    status: 'Planned',
    statusVariant: 'slate',
  },
]);

export const FREE_BASELINE_FEATURES = Object.freeze([
  'Creator profile & unlimited link listings',
  'Custom color presets, gradients & background images',
  'Typography engine with 8 curated Google fonts',
  'Visual link badges (Hot, New, Pinned, Offer)',
  'Link scheduling (Start & Expiry dates)',
  'Direct UPI Tip Jar integration with dynamic QR codes',
  'Rich media embeds (YouTube, Spotify, Apple Music, SoundCloud)',
  '7-day and 30-day analytics with device & referrer breakdowns',
  'Analytics CSV data export with spreadsheet formula safety',
  'Print & Save-as-PDF formatted profile export',
  'High-resolution (1024×1024) and Vector SVG QR code sharing',
]);

/**
 * Normalizes subscription state and entitlements into a safe billing presentation object.
 *
 * @param {Object} [entitlements] - Output of resolveEntitlements / getUserEntitlements
 * @param {Object | null} [subscription] - Raw or lean Subscription document
 * @returns {Object} Safe billing presentation view model
 */
export function formatBillingPresentation(entitlements, subscription = null) {
  const isEntitledPro = Boolean(entitlements?.isPro || entitlements?.plan === 'pro');
  const rawStatus = (subscription && typeof subscription.status === 'string')
    ? subscription.status.trim().toLowerCase()
    : (isEntitledPro ? 'active' : 'none');

  let displayStatus = 'Free Account';
  let statusBadge = 'Active';
  let statusVariant = 'neutral';

  if (isEntitledPro) {
    if (rawStatus === 'trialing') {
      displayStatus = 'Pro Trial';
      statusBadge = 'Trialing';
      statusVariant = 'indigo';
    } else {
      displayStatus = 'Pro Plan';
      statusBadge = 'Active';
      statusVariant = 'success';
    }
  } else if (rawStatus === 'canceled') {
    displayStatus = 'Free Account';
    statusBadge = 'Subscription Canceled';
    statusVariant = 'amber';
  } else if (rawStatus === 'expired') {
    displayStatus = 'Free Account';
    statusBadge = 'Previous Pro Expired';
    statusVariant = 'amber';
  } else if (rawStatus === 'past_due') {
    displayStatus = 'Free Account';
    statusBadge = 'Payment Past Due';
    statusVariant = 'amber';
  } else if (rawStatus === 'incomplete') {
    displayStatus = 'Free Account';
    statusBadge = 'Setup Incomplete';
    statusVariant = 'amber';
  }

  let periodEndLabel = null;
  if (subscription?.currentPeriodEnd) {
    const d = new Date(subscription.currentPeriodEnd);
    if (!isNaN(d.getTime())) {
      periodEndLabel = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }

  return {
    effectivePlan: isEntitledPro ? 'pro' : 'free',
    effectivePlanName: isEntitledPro ? 'Pro' : 'Free',
    displayStatus,
    statusBadge,
    statusVariant,
    isPro: isEntitledPro,
    cancelAtPeriodEnd: Boolean(subscription?.cancelAtPeriodEnd),
    periodEndLabel,
    features: toClientFeatureFlags(entitlements),
  };
}
