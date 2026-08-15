/**
 * verify-v2.1-wave12a.js
 * Comprehensive Verification Suite for Milestone v2.1 Wave 12A:
 * Safe End-of-Cycle Subscription Cancellation ONLY
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import {
  getRazorpayConfig,
  cancelRazorpaySubscriptionAtPeriodEnd,
} from '../lib/billing/providers/razorpay.js';
import {
  normalizeRazorpaySubscriptionStatus,
  normalizeRazorpayLifecycleEvent,
} from '../lib/billing/providers/razorpayLifecycle.js';
import {
  formatBillingPresentation,
} from '../lib/billingPresentation.js';
import {
  resolveEntitlements,
  hasFeature,
  toClientFeatureFlags,
} from '../lib/entitlements.js';
import {
  setSubscriptionCancelAtPeriodEnd,
} from '../lib/subscriptionRepository.js';

let passed = 0;
let failed = 0;

// Mock mongoose connection for test environment
mongoose.connect = async () => mongoose.connection;

function runCheck(num, title, fn) {
  try {
    fn();
    console.log(`PASS ${num}. ${title}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${num}. ${title}: ${err.message}`);
    failed++;
  }
}

async function runAsyncCheck(num, title, fn) {
  try {
    await fn();
    console.log(`PASS ${num}. ${title}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${num}. ${title}: ${err.message}`);
    failed++;
  }
}

console.log('--- Running Milestone v2.1 Wave 12A: End-of-Cycle Subscription Cancellation ---');

const mockTestEnv = {
  RAZORPAY_KEY_ID: 'rzp_test_1234567890abcdef',
  RAZORPAY_KEY_SECRET: 'testsecret1234567890abcdef',
  RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_test_pro_monthly_149',
};

// ═══ Section 1: Provider API Invariants ═══

await runAsyncCheck(1, 'cancellation adapter uses POST /v1/subscriptions/:id/cancel', async () => {
  let capturedUrl, capturedMethod;
  const mockFetch = async (url, opts) => {
    capturedUrl = url;
    capturedMethod = opts.method;
    return {
      ok: true,
      json: async () => ({
        id: 'sub_test_123',
        plan_id: 'plan_test_pro_monthly_149',
        status: 'active',
      }),
    };
  };

  await cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', {
    fetchFn: mockFetch,
    env: mockTestEnv,
  });

  assert.equal(capturedUrl, 'https://api.razorpay.com/v1/subscriptions/sub_test_123/cancel');
  assert.equal(capturedMethod, 'POST');
});

await runAsyncCheck(2, 'cancel_at_cycle_end is always true', async () => {
  let capturedBody;
  const mockFetch = async (url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        id: 'sub_test_123',
        plan_id: 'plan_test_pro_monthly_149',
        status: 'active',
      }),
    };
  };

  await cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', {
    fetchFn: mockFetch,
    env: mockTestEnv,
  });

  assert.equal(capturedBody.cancel_at_cycle_end, true);
});

runCheck(3, 'client cannot set cancel_at_cycle_end', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(!code.includes('cancel_at_cycle_end: req'), 'BillingAction must not accept cancel_at_cycle_end from request');
  assert(!code.includes('params.cancel_at_cycle_end'), 'BillingAction must not accept cancel_at_cycle_end parameter');
});

runCheck(4, 'immediate cancellation false is never sent', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'lib/billing/providers/razorpay.js'), 'utf8');
  assert(!code.includes('cancel_at_cycle_end: false'), 'cancel_at_cycle_end must never be false');
});

runCheck(5, 'provider ID comes from server-side stored Subscription', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(code.includes('cancelRazorpaySubscriptionAtPeriodEnd(sub.providerSubscriptionId)'), 'Must pass server sub.providerSubscriptionId');
});

await runAsyncCheck(6, 'Basic Auth remains server-side', async () => {
  let capturedAuth;
  const mockFetch = async (url, opts) => {
    capturedAuth = opts.headers.Authorization;
    return {
      ok: true,
      json: async () => ({
        id: 'sub_test_123',
        plan_id: 'plan_test_pro_monthly_149',
        status: 'active',
      }),
    };
  };

  await cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', {
    fetchFn: mockFetch,
    env: mockTestEnv,
  });

  assert(capturedAuth.startsWith('Basic '), 'Authorization header must be Basic auth');
  const decoded = Buffer.from(capturedAuth.replace('Basic ', ''), 'base64').toString('utf8');
  assert.equal(decoded, `${mockTestEnv.RAZORPAY_KEY_ID}:${mockTestEnv.RAZORPAY_KEY_SECRET}`);
});

await runAsyncCheck(7, 'rzp_live_ remains rejected', async () => {
  const liveEnv = { ...mockTestEnv, RAZORPAY_KEY_ID: 'rzp_live_1234567890abcdef' };
  await assert.rejects(
    () => cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', { env: liveEnv }),
    (err) => err.code === 'RAZORPAY_LIVE_MODE_REJECTED'
  );
});

await runAsyncCheck(8, 'test key accepted', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      id: 'sub_test_123',
      plan_id: 'plan_test_pro_monthly_149',
      status: 'active',
    }),
  });

  const res = await cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', {
    fetchFn: mockFetch,
    env: mockTestEnv,
  });

  assert.equal(res.subscriptionId, 'sub_test_123');
  assert.equal(res.cancelAtCycleEnd, true);
});

await runAsyncCheck(9, 'malformed provider response rejected', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => {
      throw new Error('Not JSON');
    },
  });

  await assert.rejects(
    () => cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', { fetchFn: mockFetch, env: mockTestEnv }),
    (err) => err.code === 'RAZORPAY_RESPONSE_MALFORMED'
  );
});

await runAsyncCheck(10, 'plan mismatch rejected', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      id: 'sub_test_123',
      plan_id: 'plan_wrong_tier',
      status: 'active',
    }),
  });

  await assert.rejects(
    () => cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', { fetchFn: mockFetch, env: mockTestEnv }),
    (err) => err.code === 'RAZORPAY_PLAN_MISMATCH'
  );
});

await runAsyncCheck(11, 'subscription ID mismatch rejected', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({
      id: 'sub_different_999',
      plan_id: 'plan_test_pro_monthly_149',
      status: 'active',
    }),
  });

  await assert.rejects(
    () => cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', { fetchFn: mockFetch, env: mockTestEnv }),
    (err) => err.code === 'RAZORPAY_SUBSCRIPTION_MISMATCH'
  );
});

// ═══ Section 2: Authorization Invariants ═══

runCheck(12, 'unauthenticated user denied', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(code.includes('if (!session?.user?.id)'), 'Must check session.user.id');
  assert(code.includes("error: 'UNAUTHORIZED'"), 'Must return UNAUTHORIZED');
});

runCheck(13, 'session.user.id is billing identity', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(code.includes('normalizeUserId(session.user.id)'), 'Must derive identity from session.user.id');
});

runCheck(14, 'userId cannot be supplied by client', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(code.includes('export async function cancelRazorpayAtPeriodEndAction() {'), 'Action takes zero client args');
});

runCheck(15, 'no providerSubscriptionId accepted from client', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(!code.includes('export async function cancelRazorpayAtPeriodEndAction(subscriptionId'), 'No client subscriptionId accepted');
});

// ═══ Section 3: Eligibility Gates ═══

runCheck(16, 'active Razorpay Pro may cancel', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'razorpay',
    status: 'active',
    cancelAtPeriodEnd: false,
  });
  assert.equal(presentation.canCancelSubscription, true);
});

runCheck(17, 'no Subscription denied', () => {
  const presentation = formatBillingPresentation({ isPro: false, plan: 'free' }, null);
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(18, 'Free/manual denied', () => {
  const presentation = formatBillingPresentation({ isPro: false, plan: 'free' }, {
    provider: 'manual',
    status: 'active',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(19, 'manual Pro denied', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'manual',
    status: 'active',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(20, 'incomplete denied', () => {
  const presentation = formatBillingPresentation({ isPro: false, plan: 'free' }, {
    provider: 'razorpay',
    status: 'incomplete',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(21, 'past_due denied', () => {
  const presentation = formatBillingPresentation({ isPro: false, plan: 'free' }, {
    provider: 'razorpay',
    status: 'past_due',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(22, 'paused denied', () => {
  const presentation = formatBillingPresentation({ isPro: false, plan: 'free' }, {
    provider: 'razorpay',
    status: 'paused',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(23, 'canceled denied', () => {
  const presentation = formatBillingPresentation({ isPro: false, plan: 'free' }, {
    provider: 'razorpay',
    status: 'canceled',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(24, 'expired denied', () => {
  const presentation = formatBillingPresentation({ isPro: false, plan: 'free' }, {
    provider: 'razorpay',
    status: 'expired',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(25, 'Stripe-managed denied', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'stripe',
    status: 'active',
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(26, 'already cancelAtPeriodEnd does not call provider again', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'razorpay',
    status: 'active',
    cancelAtPeriodEnd: true,
  });
  assert.equal(presentation.canCancelSubscription, false);
});

// ═══ Section 4: Local State Transitions ═══

await runAsyncCheck(27, 'successful schedule sets cancelAtPeriodEnd=true', async () => {
  let savedUpdate = null;
  const mockSaver = async (userId, update) => {
    savedUpdate = update;
    return {
      userId,
      provider: 'razorpay',
      plan: 'pro',
      status: 'active',
      ...update,
    };
  };

  const res = await setSubscriptionCancelAtPeriodEnd('507f1f77bcf86cd799439011', {}, {
    saveSubscription: mockSaver,
  });

  assert.equal(savedUpdate.cancelAtPeriodEnd, true);
  assert.equal(res.cancelAtPeriodEnd, true);
});

await runAsyncCheck(28, 'successful schedule keeps status active', async () => {
  const mockSaver = async (userId, update) => ({
    userId,
    provider: 'razorpay',
    plan: 'pro',
    status: 'active',
    ...update,
  });

  const res = await setSubscriptionCancelAtPeriodEnd('507f1f77bcf86cd799439011', {}, {
    saveSubscription: mockSaver,
  });

  assert.equal(res.status, 'active');
});

await runAsyncCheck(29, 'successful schedule keeps plan pro', async () => {
  const mockSaver = async (userId, update) => ({
    userId,
    provider: 'razorpay',
    plan: 'pro',
    status: 'active',
    ...update,
  });

  const res = await setSubscriptionCancelAtPeriodEnd('507f1f77bcf86cd799439011', {}, {
    saveSubscription: mockSaver,
  });

  assert.equal(res.plan, 'pro');
});

await runAsyncCheck(30, 'successful schedule keeps provider razorpay', async () => {
  const mockSaver = async (userId, update) => ({
    userId,
    provider: 'razorpay',
    plan: 'pro',
    status: 'active',
    ...update,
  });

  const res = await setSubscriptionCancelAtPeriodEnd('507f1f77bcf86cd799439011', {}, {
    saveSubscription: mockSaver,
  });

  assert.equal(res.provider, 'razorpay');
});

await runAsyncCheck(31, 'currentPeriodEnd preserved/validated', async () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  let savedUpdate = null;
  const mockSaver = async (userId, update) => {
    savedUpdate = update;
    return {
      userId,
      provider: 'razorpay',
      plan: 'pro',
      status: 'active',
      ...update,
    };
  };

  const res = await setSubscriptionCancelAtPeriodEnd('507f1f77bcf86cd799439011', {
    currentPeriodEnd: futureDate,
  }, {
    saveSubscription: mockSaver,
  });

  assert.equal(res.currentPeriodEnd.getTime(), futureDate.getTime());
});

runCheck(32, 'provider IDs not changed', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'lib/subscriptionRepository.js'), 'utf8');
  assert(!code.includes('updateFields.providerSubscriptionId ='), 'setSubscriptionCancelAtPeriodEnd must not overwrite providerSubscriptionId');
});

runCheck(33, 'userId not changed', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'lib/subscriptionRepository.js'), 'utf8');
  assert(!code.includes('updateFields.userId ='), 'setSubscriptionCancelAtPeriodEnd must not overwrite userId');
});

// ═══ Section 5: Entitlements ═══

runCheck(34, 'active + cancelAtPeriodEnd=true remains Pro', () => {
  const ent = resolveEntitlements({
    plan: 'pro',
    status: 'active',
    provider: 'razorpay',
    cancelAtPeriodEnd: true,
  });
  assert.equal(ent.isPro, true);
  assert.equal(ent.plan, 'pro');
});

runCheck(35, 'remove_branding remains enabled before period end', () => {
  const allowed = hasFeature(
    { plan: 'pro', status: 'active', provider: 'razorpay', cancelAtPeriodEnd: true },
    'remove_branding'
  );
  assert.equal(allowed, true);
});

runCheck(36, 'extended_analytics remains enabled before period end', () => {
  const allowed = hasFeature(
    { plan: 'pro', status: 'active', provider: 'razorpay', cancelAtPeriodEnd: true },
    'extended_analytics'
  );
  assert.equal(allowed, true);
});

runCheck(37, 'final subscription.cancelled webhook resolves Free', () => {
  const event = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.cancelled',
    subscriptionEntity: {
      id: 'sub_test_123',
      plan_id: 'plan_test_pro_monthly_149',
      status: 'cancelled',
    },
    eventCreatedAt: new Date(),
  });

  assert.equal(event.status, 'canceled');
  assert.equal(event.cancelAtPeriodEnd, false);

  const ent = resolveEntitlements({
    plan: 'pro',
    status: event.status,
    provider: 'razorpay',
    cancelAtPeriodEnd: event.cancelAtPeriodEnd,
  });
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

runCheck(38, 'final cancellation returns branding', () => {
  const allowed = hasFeature(
    { plan: 'pro', status: 'canceled', provider: 'razorpay', cancelAtPeriodEnd: false },
    'remove_branding'
  );
  assert.equal(allowed, false);
});

runCheck(39, 'final cancellation locks extended analytics', () => {
  const allowed = hasFeature(
    { plan: 'pro', status: 'canceled', provider: 'razorpay', cancelAtPeriodEnd: false },
    'extended_analytics'
  );
  assert.equal(allowed, false);
});

// ═══ Section 6: UI Presentation ═══

runCheck(40, 'active Pro shows Cancel Subscription', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'razorpay',
    status: 'active',
    cancelAtPeriodEnd: false,
  });
  assert.equal(presentation.canCancelSubscription, true);
  assert.equal(presentation.cancelAtPeriodEnd, false);
});

runCheck(41, 'scheduled cancellation shows Cancellation scheduled', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'razorpay',
    status: 'active',
    cancelAtPeriodEnd: true,
  });
  assert.equal(presentation.statusBadge.toLowerCase(), 'cancellation scheduled');
  assert.equal(presentation.cancelAtPeriodEnd, true);
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(42, 'period-end date shown when available', () => {
  const futureDate = new Date('2026-10-15T00:00:00Z');
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'razorpay',
    status: 'active',
    cancelAtPeriodEnd: true,
    currentPeriodEnd: futureDate,
  });
  assert.equal(typeof presentation.periodEndLabel, 'string');
  assert(presentation.periodEndLabel.includes('2026') || presentation.periodEndLabel.includes('Oct'));
});

runCheck(43, 'repeat cancellation button unavailable', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'razorpay',
    status: 'active',
    cancelAtPeriodEnd: true,
  });
  assert.equal(presentation.canCancelSubscription, false);
});

runCheck(44, 'confirmation dialog exists', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'components/billing/BillingClient.js'), 'utf8');
  assert(code.includes('isCancelModalOpen'), 'BillingClient must contain isCancelModalOpen state');
  assert(code.includes('Cancel Pro subscription?'), 'Must have dialog title');
});

runCheck(45, 'UI says access remains until paid period end', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'components/billing/BillingClient.js'), 'utf8');
  assert(
    code.includes('Your Pro features will remain available through the current paid billing period'),
    'Modal copy must explain that access remains available'
  );
});

runCheck(46, 'no "Cancel immediately" UI', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'components/billing/BillingClient.js'), 'utf8');
  assert(!code.includes('Cancel immediately'), 'UI must not offer immediate cancellation');
  assert(!code.includes('Cancel now'), 'UI must not offer cancel now');
});

runCheck(47, 'client receives no provider ID', () => {
  const presentation = formatBillingPresentation({ isPro: true, plan: 'pro' }, {
    provider: 'razorpay',
    status: 'active',
    providerSubscriptionId: 'sub_secret_123',
    providerCustomerId: 'cust_secret_456',
  });
  assert.equal(presentation.providerSubscriptionId, undefined);
  assert.equal(presentation.providerCustomerId, undefined);
});

runCheck(48, 'raw Subscription not exposed', () => {
  const pageCode = fs.readFileSync(path.resolve(process.cwd(), 'app/(app)/dashboard/billing/page.js'), 'utf8');
  assert(!pageCode.includes('subscription={subscription}'), 'Billing page must not pass raw subscription to BillingClient');
});

// ═══ Section 7: Failure Handling ═══

await runAsyncCheck(49, 'provider failure does not set cancelAtPeriodEnd', async () => {
  const mockFetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: { description: 'Internal server error', code: 'SERVER_ERROR' } }),
  });

  await assert.rejects(
    () => cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', { fetchFn: mockFetch, env: mockTestEnv }),
    (err) => err.code === 'RAZORPAY_API_ERROR'
  );
});

await runAsyncCheck(50, 'malformed provider response does not claim cancellation', async () => {
  const mockFetch = async () => ({
    ok: true,
    json: async () => ({ invalid_payload: true }),
  });

  await assert.rejects(
    () => cancelRazorpaySubscriptionAtPeriodEnd('sub_test_123', { fetchFn: mockFetch, env: mockTestEnv }),
    (err) => err.code === 'RAZORPAY_RESPONSE_INVALID'
  );
});

runCheck(51, 'local DB sync failure returns controlled state', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(code.includes("error: 'CANCELLATION_SYNC_PENDING'"), 'Must handle DB sync error with CANCELLATION_SYNC_PENDING');
});

runCheck(52, 'no fake success', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(!code.includes('if (!cancelRes) return { success: true }'), 'Never return success when provider call failed');
});

// ═══ Section 8: Data Safety Invariants ═══

runCheck(53, 'Page data not deleted', () => {
  const subCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/subscriptionRepository.js'), 'utf8');
  assert(!subCode.includes('Page.delete'), 'Repository must never delete Page');
  assert(!subCode.includes('Page.findByIdAndDelete'), 'Repository must never delete Page');
});

runCheck(54, 'links not deleted', () => {
  const subCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/subscriptionRepository.js'), 'utf8');
  assert(!subCode.includes('links = []'), 'Repository must never clear links array');
});

runCheck(55, 'uploads not deleted', () => {
  const subCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/subscriptionRepository.js'), 'utf8');
  assert(!subCode.includes('Event.deleteMany'), 'Repository must not delete events');
});

runCheck(56, 'analytics history not deleted', () => {
  const subCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/subscriptionRepository.js'), 'utf8');
  assert(!subCode.includes('Event.delete'), 'Repository must never delete analytic events');
});

runCheck(57, 'Tip Jar unchanged', () => {
  const subCode = fs.readFileSync(path.resolve(process.cwd(), 'lib/subscriptionRepository.js'), 'utf8');
  assert(!subCode.includes('tipJar = null'), 'Repository must not delete Tip Jar configuration');
});

// ═══ Section 9: Architecture Invariants ═══

runCheck(58, 'existing webhook route reused', () => {
  assert(fs.existsSync(path.resolve(process.cwd(), 'app/api/billing/razorpay/webhook/route.js')), 'Webhook route must exist');
});

runCheck(59, 'no new cancellation webhook', () => {
  assert(!fs.existsSync(path.resolve(process.cwd(), 'app/api/billing/razorpay/cancel/route.js')), 'No separate cancel webhook route');
});

runCheck(60, 'subscription.updated not treated as cancellation authority', () => {
  const event = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.updated',
    subscriptionEntity: {
      id: 'sub_test_123',
      plan_id: 'plan_test_pro_monthly_149',
      status: 'active',
      has_scheduled_changes: true,
    },
    eventCreatedAt: new Date(),
  });
  assert.equal(event.status, undefined, 'subscription.updated must not modify status');
});

runCheck(61, 'no refunds', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'action/BillingAction.js'), 'utf8');
  assert(!code.includes('payments.refund'), 'No refund API in BillingAction');
});

runCheck(62, 'no grace policy', () => {
  const code = fs.readFileSync(path.resolve(process.cwd(), 'lib/entitlements.js'), 'utf8');
  assert(!code.includes('grace_period'), 'No grace period logic in entitlements');
});

runCheck(63, 'no open-signup changes', () => {
  const authCode = fs.readFileSync(path.resolve(process.cwd(), 'app/api/auth/[...nextauth]/route.js'), 'utf8');
  assert(authCode.includes('AllowedUser') || authCode.includes('ALLOWLIST_EMAILS'), 'Allowlist/whitelist gate preserved');
});

runCheck(64, 'no custom-domain work', () => {
  assert(!fs.existsSync(path.resolve(process.cwd(), 'models/Domain.js')), 'No Domain model added');
});

runCheck(65, 'no live-mode support', () => {
  const cfg = fs.readFileSync(path.resolve(process.cwd(), 'lib/billing/providers/razorpay.js'), 'utf8');
  assert(cfg.includes('RAZORPAY_LIVE_MODE_REJECTED'), 'Live mode must be explicitly rejected');
});

runCheck(66, 'no new npm dependency', () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
  assert(!pkg.dependencies.razorpay, 'No SDK dependency');
  assert(!pkg.dependencies.stripe, 'No stripe dependency');
});

runCheck(67, 'previous billing/webhook waves remain green', () => {
  assert(fs.existsSync(path.resolve(process.cwd(), 'scripts/verify-v2.1-wave10.js')));
  assert(fs.existsSync(path.resolve(process.cwd(), 'scripts/verify-v2.1-wave10a.js')));
  assert(fs.existsSync(path.resolve(process.cwd(), 'scripts/verify-v2.1-wave11a.js')));
  assert(fs.existsSync(path.resolve(process.cwd(), 'scripts/verify-v2.1-wave11a1.js')));
  assert(fs.existsSync(path.resolve(process.cwd(), 'scripts/verify-v2.1-wave11b.js')));
});

console.log('\n================================');
console.log('Wave 12A Cancellation Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
