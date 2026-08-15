/**
 * Shared Compliance, Commercial Identity & Policy Constants
 * Single source of truth for public legal documentation and commercial review.
 */

export const COMMERCIAL_IDENTITY = Object.freeze({
  productName: 'Prince Links',
  platformDomain: 'https://links.princeji.com',
  platformHost: 'links.princeji.com',
  operatorName: 'PRINCE',
  brandName: 'princeji',
  businessType: 'Individual',
  supportEmail: 'support@princeji.com',
  lastUpdated: 'August 15, 2026',
});

export const PRICING_DETAILS = Object.freeze({
  free: {
    name: 'Free',
    price: '₹0',
    interval: 'month',
    headline: 'Baseline Creator Toolkit',
  },
  pro: {
    name: 'Pro',
    price: '₹149',
    interval: 'month',
    headline: 'Advanced Analytics & White-Label',
    currency: 'INR',
    amount: 149,
  },
});
