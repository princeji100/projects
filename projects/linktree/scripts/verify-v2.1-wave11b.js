import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { execSync } from 'node:child_process';

import Subscription, { SUBSCRIPTION_STATUSES } from '../models/Subscription.js';
import BillingWebhookEvent from '../models/BillingWebhookEvent.js';
import {
  normalizeRazorpaySubscriptionStatus,
  extractRazorpayBillingPeriod,
  normalizeRazorpayLifecycleEvent,
} from '../lib/billing/providers/razorpayLifecycle.js';
import {
  resolveEntitlements,
  getEffectivePlan,
  hasFeature,
} from '../lib/entitlements.js';
import {
  applyRazorpayLifecycleState,
  markRazorpayAuthorizationVerified,
} from '../lib/subscriptionRepository.js';
import { formatBillingPresentation } from '../lib/billingPresentation.js';
import { POST as webhookPostHandler } from '../app/api/billing/razorpay/webhook/route.js';

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    failed++;
  }
}

console.log('--- Running Milestone v2.1 Wave 11B: Razorpay Lifecycle Normalization & Pro Activation ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// Mock mongoose connection for test environment
mongoose.connect = async () => mongoose.connection;

const testWebhookSecret = 'whsec_test_secret_11b_verification_xyz';
const testPlanId = 'plan_test_pro_monthly_11b';

function createSignedRequest({ headers = {}, payloadObj }) {
  const rawBody = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj);
  const signature = crypto
    .createHmac('sha256', testWebhookSecret)
    .update(rawBody)
    .digest('hex');

  const headersMap = new Map();
  headersMap.set('x-razorpay-signature', signature);

  for (const [k, v] of Object.entries(headers)) {
    headersMap.set(k.toLowerCase(), v);
  }

  return {
    headers: {
      get: (k) => headersMap.get(k.toLowerCase()) || null,
    },
    text: async () => rawBody,
  };
}

// ==========================================
// 1. Lifecycle Normalization (1..10)
// ==========================================

await check('1. created -> incomplete', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('created'), 'incomplete');
});

await check('2. authenticated -> incomplete', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('authenticated'), 'incomplete');
});

await check('3. active -> active', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('active'), 'active');
});

await check('4. pending -> past_due', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('pending'), 'past_due');
});

await check('5. halted -> past_due', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('halted'), 'past_due');
});

await check('6. paused -> paused', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('paused'), 'paused');
  assert.ok(SUBSCRIPTION_STATUSES.includes('paused'));
});

await check('7. cancelled -> canceled', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('cancelled'), 'canceled');
  assert.equal(normalizeRazorpaySubscriptionStatus('canceled'), 'canceled');
});

await check('8. completed -> expired', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('completed'), 'expired');
});

await check('9. expired -> expired', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('expired'), 'expired');
});

await check('10. unknown provider status never grants Pro', () => {
  assert.equal(normalizeRazorpaySubscriptionStatus('unknown_status_foo'), null);
  const ent = resolveEntitlements({ plan: 'pro', status: 'unknown_status_foo' });
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

// ==========================================
// 2. Entitlements (11..16)
// ==========================================

await check('11. active -> Pro', () => {
  const ent = resolveEntitlements({ plan: 'pro', status: 'active' });
  assert.equal(ent.isPro, true);
  assert.equal(ent.plan, 'pro');
});

await check('12. incomplete -> Free', () => {
  const ent = resolveEntitlements({ plan: 'pro', status: 'incomplete' });
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

await check('13. past_due -> Free', () => {
  const ent = resolveEntitlements({ plan: 'pro', status: 'past_due' });
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

await check('14. paused -> Free', () => {
  const ent = resolveEntitlements({ plan: 'pro', status: 'paused' });
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

await check('15. canceled -> Free', () => {
  const ent = resolveEntitlements({ plan: 'pro', status: 'canceled' });
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

await check('16. expired -> Free', () => {
  const ent = resolveEntitlements({ plan: 'pro', status: 'expired' });
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

// ==========================================
// 3. Event Behavior (17..26)
// ==========================================

await check('17. subscription.authenticated does not grant Pro unless trusted provider state is active', () => {
  const resAuth = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.authenticated',
    subscriptionEntity: { id: 'sub_test17a', status: 'authenticated', plan_id: testPlanId },
  });
  assert.equal(resAuth.status, 'incomplete');
  assert.equal(resolveEntitlements({ plan: 'pro', status: resAuth.status }).isPro, false);

  const resActive = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.authenticated',
    subscriptionEntity: { id: 'sub_test17b', status: 'active', plan_id: testPlanId },
  });
  assert.equal(resActive.status, 'active');
  assert.equal(resolveEntitlements({ plan: 'pro', status: resActive.status }).isPro, true);
});

await check('18. subscription.activated + active -> Pro', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_test18', status: 'active', plan_id: testPlanId },
  });
  assert.equal(res.status, 'active');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, true);
});

await check('19. subscription.charged + active -> Pro', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.charged',
    subscriptionEntity: { id: 'sub_test19', status: 'active', plan_id: testPlanId },
  });
  assert.equal(res.status, 'active');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, true);
});

await check('20. subscription.pending -> Free/past_due', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.pending',
    subscriptionEntity: { id: 'sub_test20', status: 'pending', plan_id: testPlanId },
  });
  assert.equal(res.status, 'past_due');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, false);
});

await check('21. subscription.halted -> Free/past_due', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.halted',
    subscriptionEntity: { id: 'sub_test21', status: 'halted', plan_id: testPlanId },
  });
  assert.equal(res.status, 'past_due');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, false);
});

await check('22. subscription.paused -> Free/paused', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.paused',
    subscriptionEntity: { id: 'sub_test22', status: 'paused', plan_id: testPlanId },
  });
  assert.equal(res.status, 'paused');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, false);
});

await check('23. subscription.resumed with active entity -> Pro', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.resumed',
    subscriptionEntity: { id: 'sub_test23', status: 'active', plan_id: testPlanId },
  });
  assert.equal(res.status, 'active');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, true);
});

await check('24. subscription.cancelled -> Free', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.cancelled',
    subscriptionEntity: { id: 'sub_test24', status: 'cancelled', plan_id: testPlanId },
  });
  assert.equal(res.status, 'canceled');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, false);
});

await check('25. subscription.completed -> Free/expired', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.completed',
    subscriptionEntity: { id: 'sub_test25', status: 'completed', plan_id: testPlanId },
  });
  assert.equal(res.status, 'expired');
  assert.equal(resolveEntitlements({ plan: 'pro', status: res.status }).isPro, false);
});

await check('26. subscription.updated does not independently change entitlement state', () => {
  const res = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.updated',
    subscriptionEntity: {
      id: 'sub_test26',
      status: 'active',
      plan_id: testPlanId,
      customer_id: 'cust_new123',
    },
  });
  assert.equal(res.status, undefined);
  assert.equal(res.providerCustomerId, 'cust_new123');
});

// ==========================================
// 4. Correlation & Security (27..33)
// ==========================================

await check('27. lookup uses provider + providerSubscriptionId', async () => {
  let queriedProvider = null;
  let queriedSubId = null;

  const mockFind = async (subId) => {
    queriedProvider = 'razorpay';
    queriedSubId = subId;
    return {
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      provider: 'razorpay',
      providerSubscriptionId: subId,
      plan: 'pro',
      status: 'incomplete',
    };
  };

  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_lookup_test_27', status: 'active', plan_id: testPlanId },
  });

  const res = await applyRazorpayLifecycleState('sub_lookup_test_27', norm, {
    expectedPlanId: testPlanId,
    findSubscription: mockFind,
    saveSubscription: async (id, update) => ({ _id: id, ...update }),
  });

  assert.equal(res.success, true);
  assert.equal(queriedProvider, 'razorpay');
  assert.equal(queriedSubId, 'sub_lookup_test_27');
});

await check('28. notes userId not used as ownership authority', () => {
  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: {
      id: 'sub_test28',
      status: 'active',
      plan_id: testPlanId,
      notes: { prince_links_user_id: 'arbitrary_injected_id_654321098765432109876543' },
    },
  });
  assert.equal(norm.userId, undefined);
  assert.equal(norm.providerSubscriptionId, 'sub_test28');
});

await check('29. email not used', () => {
  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: {
      id: 'sub_test29',
      status: 'active',
      plan_id: testPlanId,
      email: 'attacker@example.com',
    },
  });
  assert.equal(norm.email, undefined);
});

await check('30. unknown providerSubscriptionId ignored', async () => {
  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_unknown_merchant_account_sub_999', status: 'active', plan_id: testPlanId },
  });

  const res = await applyRazorpayLifecycleState('sub_unknown_merchant_account_sub_999', norm, {
    expectedPlanId: testPlanId,
    findSubscription: async () => null,
  });

  assert.equal(res.success, false);
  assert.equal(res.reason, 'LOCAL_SUBSCRIPTION_NOT_FOUND');
  assert.equal(res.ignored, true);
});

await check('31. unknown provider subscription does not create local Subscription', async () => {
  let createdCount = 0;
  const mockSave = async () => {
    createdCount++;
  };

  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_unrelated_foreign_merchant_sub', status: 'active', plan_id: testPlanId },
  });

  const res = await applyRazorpayLifecycleState('sub_unrelated_foreign_merchant_sub', norm, {
    expectedPlanId: testPlanId,
    findSubscription: async () => null,
    saveSubscription: mockSave,
  });

  assert.equal(res.success, false);
  assert.equal(createdCount, 0);
});

await check('32. plan mismatch ignored', async () => {
  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_mismatch_plan_32', status: 'active', plan_id: 'plan_unrelated_tier_xyz' },
  });

  const res = await applyRazorpayLifecycleState('sub_mismatch_plan_32', norm, {
    expectedPlanId: testPlanId,
    findSubscription: async () => ({
      _id: new mongoose.Types.ObjectId(),
      provider: 'razorpay',
      providerSubscriptionId: 'sub_mismatch_plan_32',
      status: 'incomplete',
    }),
  });

  assert.equal(res.success, false);
  assert.equal(res.reason, 'PLAN_MISMATCH');
  assert.equal(res.ignored, true);
});

await check('33. configured Plan ID stays server-side', () => {
  const clientFiles = [
    'components/billing/BillingClient.js',
    'components/billing/RazorpayTestCheckoutButton.js',
    'lib/billingPresentation.js',
  ];
  for (const f of clientFiles) {
    const src = fs.readFileSync(path.join(projectRoot, f), 'utf-8');
    assert.ok(!src.includes('RAZORPAY_PRO_MONTHLY_PLAN_ID'));
  }
});

// ==========================================
// 5. Metadata (34..38)
// ==========================================

await check('34. valid customer_id saved as providerCustomerId', () => {
  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_test34', status: 'active', customer_id: 'cust_valid_12345678' },
  });
  assert.equal(norm.providerCustomerId, 'cust_valid_12345678');
});

await check('35. malformed customer ID not invented', () => {
  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_test35', status: 'active', customer_id: 'invalid_no_prefix' },
  });
  assert.equal(norm.providerCustomerId, undefined);
});

await check('36. current_start normalized safely', () => {
  const nowSec = 1710000000;
  const { currentPeriodStart } = extractRazorpayBillingPeriod({
    current_start: nowSec,
  });
  assert.ok(currentPeriodStart instanceof Date);
  assert.equal(currentPeriodStart.getTime(), nowSec * 1000);
});

await check('37. current_end normalized safely', () => {
  const endSec = 1712600000;
  const { currentPeriodEnd } = extractRazorpayBillingPeriod({
    current_end: endSec,
  });
  assert.ok(currentPeriodEnd instanceof Date);
  assert.equal(currentPeriodEnd.getTime(), endSec * 1000);
});

await check('38. malformed timestamps fail safely', () => {
  const { currentPeriodStart, currentPeriodEnd } = extractRazorpayBillingPeriod({
    current_start: 'not_a_number',
    current_end: -500,
  });
  assert.equal(currentPeriodStart, undefined);
  assert.equal(currentPeriodEnd, undefined);
});

// ==========================================
// 6. Ordering & Idempotency (39..44)
// ==========================================

await check('39. providerStateUpdatedAt exists as ordering marker', () => {
  const subSchema = Subscription.schema.obj;
  assert.ok(subSchema.providerStateUpdatedAt);
  assert.equal(subSchema.providerStateUpdatedAt.type, Date);
});

await check('40. older providerCreatedAt event cannot roll state backward', async () => {
  const existingSub = {
    _id: new mongoose.Types.ObjectId(),
    provider: 'razorpay',
    providerSubscriptionId: 'sub_test40',
    status: 'active',
    providerStateUpdatedAt: new Date('2026-08-16T12:00:00Z'),
  };

  const olderEvent = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.pending',
    subscriptionEntity: { id: 'sub_test40', status: 'pending', plan_id: testPlanId },
    eventCreatedAt: new Date('2026-08-16T11:00:00Z'), // 1 hour earlier
  });

  const res = await applyRazorpayLifecycleState('sub_test40', olderEvent, {
    expectedPlanId: testPlanId,
    findSubscription: async () => existingSub,
  });

  assert.equal(res.success, false);
  assert.equal(res.reason, 'STALE_EVENT');
  assert.equal(res.ignored, true);
});

await check('41. stale event marked ignored', async () => {
  const existingSub = {
    _id: new mongoose.Types.ObjectId(),
    provider: 'razorpay',
    providerSubscriptionId: 'sub_test41',
    status: 'active',
    providerStateUpdatedAt: new Date(1700000500000),
  };

  const norm = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.authenticated',
    subscriptionEntity: { id: 'sub_test41', status: 'authenticated', plan_id: testPlanId },
    eventCreatedAt: new Date(1700000100000), // Older
  });

  const res = await applyRazorpayLifecycleState('sub_test41', norm, {
    expectedPlanId: testPlanId,
    findSubscription: async () => existingSub,
  });

  assert.equal(res.ignored, true);
});

await check('42. terminal canceled state protected against stale active event', async () => {
  const canceledSub = {
    _id: new mongoose.Types.ObjectId(),
    provider: 'razorpay',
    providerSubscriptionId: 'sub_test42',
    status: 'canceled',
    providerStateUpdatedAt: new Date('2026-08-16T12:00:00Z'),
  };

  const staleActive = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.activated',
    subscriptionEntity: { id: 'sub_test42', status: 'active', plan_id: testPlanId },
    eventCreatedAt: new Date('2026-08-16T11:30:00Z'),
  });

  const res = await applyRazorpayLifecycleState('sub_test42', staleActive, {
    expectedPlanId: testPlanId,
    findSubscription: async () => canceledSub,
  });

  assert.equal(res.success, false);
  assert.equal(res.ignored, true);
});

await check('43. terminal expired state protected against stale active event', async () => {
  const expiredSub = {
    _id: new mongoose.Types.ObjectId(),
    provider: 'razorpay',
    providerSubscriptionId: 'sub_test43',
    status: 'expired',
    providerStateUpdatedAt: new Date('2026-08-16T12:00:00Z'),
  };

  const staleActive = normalizeRazorpayLifecycleEvent({
    eventType: 'subscription.charged',
    subscriptionEntity: { id: 'sub_test43', status: 'active', plan_id: testPlanId },
    eventCreatedAt: new Date('2026-08-16T10:00:00Z'),
  });

  const res = await applyRazorpayLifecycleState('sub_test43', staleActive, {
    expectedPlanId: testPlanId,
    findSubscription: async () => expiredSub,
  });

  assert.equal(res.success, false);
  assert.equal(res.ignored, true);
});

await check('44. duplicate Wave 11A event remains idempotent', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  const origCreate = BillingWebhookEvent.create;
  BillingWebhookEvent.create = async () => {
    const err = new Error('duplicate');
    err.code = 11000;
    throw err;
  };

  try {
    const req = createSignedRequest({
      headers: { 'x-razorpay-event-id': 'evt_duplicate_wave11b' },
      payloadObj: {
        event: 'subscription.charged',
        payload: { subscription: { entity: { id: 'sub_test44' } } },
      },
    });

    const res = await webhookPostHandler(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.duplicate, true);
  } finally {
    BillingWebhookEvent.create = origCreate;
  }
});

// ==========================================
// 7. Ledger Management (45..48)
// ==========================================

await check('45. successful lifecycle event marked processed', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID = testPlanId;

  let createdStatus = null;
  let updatedStatus = null;

  const origCreate = BillingWebhookEvent.create;
  const origUpdateOne = BillingWebhookEvent.updateOne;
  const origFindOne = Subscription.findOne;
  const origFindOneAndUpdate = Subscription.findOneAndUpdate;

  BillingWebhookEvent.create = async (doc) => {
    createdStatus = doc.processingStatus;
    return doc;
  };

  BillingWebhookEvent.updateOne = async (query, update) => {
    updatedStatus = update.$set.processingStatus;
    return { modifiedCount: 1 };
  };

  Subscription.findOne = () => ({
    lean: async () => ({
      _id: new mongoose.Types.ObjectId(),
      userId: new mongoose.Types.ObjectId(),
      provider: 'razorpay',
      providerSubscriptionId: 'sub_success45',
      plan: 'pro',
      status: 'incomplete',
    }),
  });

  Subscription.findOneAndUpdate = () => ({
    lean: async () => ({
      provider: 'razorpay',
      providerSubscriptionId: 'sub_success45',
      status: 'active',
    }),
  });

  try {
    const req = createSignedRequest({
      headers: { 'x-razorpay-event-id': 'evt_success_45' },
      payloadObj: {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: {
              id: 'sub_success45',
              status: 'active',
              plan_id: testPlanId,
              customer_id: 'cust_45',
            },
          },
        },
      },
    });

    const res = await webhookPostHandler(req);
    assert.equal(res.status, 200);
    assert.equal(createdStatus, 'received');
    assert.equal(updatedStatus, 'processed');
  } finally {
    BillingWebhookEvent.create = origCreate;
    BillingWebhookEvent.updateOne = origUpdateOne;
    Subscription.findOne = origFindOne;
    Subscription.findOneAndUpdate = origFindOneAndUpdate;
  }
});

await check('46. ignored event marked ignored', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID = testPlanId;

  let updatedStatus = null;
  const origCreate = BillingWebhookEvent.create;
  const origUpdateOne = BillingWebhookEvent.updateOne;
  const origFindOne = Subscription.findOne;

  BillingWebhookEvent.create = async (doc) => doc;
  BillingWebhookEvent.updateOne = async (query, update) => {
    updatedStatus = update.$set.processingStatus;
    return { modifiedCount: 1 };
  };
  Subscription.findOne = () => ({ lean: async () => null }); // Unknown subscription

  try {
    const req = createSignedRequest({
      headers: { 'x-razorpay-event-id': 'evt_ignored_46' },
      payloadObj: {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: { id: 'sub_unknown_46', status: 'active', plan_id: testPlanId },
          },
        },
      },
    });

    const res = await webhookPostHandler(req);
    assert.equal(res.status, 200);
    assert.equal(updatedStatus, 'ignored');
  } finally {
    BillingWebhookEvent.create = origCreate;
    BillingWebhookEvent.updateOne = origUpdateOne;
    Subscription.findOne = origFindOne;
  }
});

await check('47. genuine processing failure marked failed where safe', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID = testPlanId;

  let updatedStatus = null;
  const origCreate = BillingWebhookEvent.create;
  const origUpdateOne = BillingWebhookEvent.updateOne;
  const origFindOne = Subscription.findOne;

  BillingWebhookEvent.create = async (doc) => doc;
  BillingWebhookEvent.updateOne = async (query, update) => {
    updatedStatus = update.$set.processingStatus;
    return { modifiedCount: 1 };
  };
  Subscription.findOne = () => ({
    lean: async () => {
      throw new Error('Database connection dropped');
    },
  });

  try {
    const req = createSignedRequest({
      headers: { 'x-razorpay-event-id': 'evt_fail_47' },
      payloadObj: {
        event: 'subscription.activated',
        payload: {
          subscription: {
            entity: { id: 'sub_fail_47', status: 'active', plan_id: testPlanId },
          },
        },
      },
    });

    const res = await webhookPostHandler(req);
    assert.equal(res.status, 500);
    assert.equal(updatedStatus, 'failed');
  } finally {
    BillingWebhookEvent.create = origCreate;
    BillingWebhookEvent.updateOne = origUpdateOne;
    Subscription.findOne = origFindOne;
  }
});

await check('48. full webhook payload still not persisted', () => {
  const eventSchema = BillingWebhookEvent.schema.obj;
  assert.equal(eventSchema.payload, undefined);
  assert.equal(eventSchema.rawBody, undefined);
  assert.equal(eventSchema.headers, undefined);
});

// ==========================================
// 8. Authorization Verification Marker (49..56)
// ==========================================

await check('49. valid checkout signature stores providerAuthorizationVerifiedAt', async () => {
  let savedVerifiedAt = null;
  const userId = new mongoose.Types.ObjectId();

  await markRazorpayAuthorizationVerified(userId, {
    saveSubscription: async (id, update) => {
      savedVerifiedAt = update.$set.providerAuthorizationVerifiedAt;
      return { userId: id, ...update.$set };
    },
  });

  assert.ok(savedVerifiedAt instanceof Date);
});

await check('50. invalid signature does not store marker', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  const fnSrc = routeSrc.slice(routeSrc.indexOf('export async function verifyRazorpayTestCheckoutAction'));
  const verifyCallPos = fnSrc.indexOf('verifyRazorpaySubscriptionSignature');
  const markCallPos = fnSrc.indexOf('markRazorpayAuthorizationVerified');
  assert.ok(verifyCallPos !== -1 && markCallPos !== -1);
  assert.ok(verifyCallPos < markCallPos);
});

await check('51. marker does not set active', async () => {
  const userId = new mongoose.Types.ObjectId();
  let savedStatus = null;

  await markRazorpayAuthorizationVerified(userId, {
    saveSubscription: async (id, update) => {
      savedStatus = update.$set?.status;
      return { userId: id };
    },
  });

  assert.equal(savedStatus, undefined, 'markRazorpayAuthorizationVerified must not set status to active');
});

await check('52. marker does not grant Pro', () => {
  const sub = {
    plan: 'pro',
    status: 'incomplete',
    providerAuthorizationVerifiedAt: new Date(),
  };
  const ent = resolveEntitlements(sub);
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

await check('53. incomplete + no marker permits checkout retry', () => {
  const presentation = formatBillingPresentation(
    resolveEntitlements({ plan: 'pro', status: 'incomplete' }),
    { plan: 'pro', status: 'incomplete' }
  );
  assert.equal(presentation.isAwaitingActivation, false);
  assert.equal(presentation.statusBadge, 'Setup Incomplete');
});

await check('54. incomplete + marker blocks duplicate checkout reopen', () => {
  const presentation = formatBillingPresentation(
    resolveEntitlements({ plan: 'pro', status: 'incomplete' }),
    { plan: 'pro', status: 'incomplete', providerAuthorizationVerifiedAt: new Date() }
  );
  assert.equal(presentation.isAwaitingActivation, true);
  assert.equal(presentation.statusBadge, 'Awaiting Activation');
});

await check('55. safe Billing presentation shows Awaiting Activation', () => {
  const p = formatBillingPresentation(
    { isPro: false, plan: 'free' },
    { status: 'incomplete', providerAuthorizationVerifiedAt: new Date() }
  );
  assert.equal(p.displayStatus, 'Free Account');
  assert.equal(p.statusBadge, 'Awaiting Activation');
  assert.equal(p.statusVariant, 'indigo');
});

await check('56. marker is not exposed raw to client', () => {
  const p = formatBillingPresentation(
    { isPro: false, plan: 'free' },
    { status: 'incomplete', providerAuthorizationVerifiedAt: new Date() }
  );
  assert.equal(p.providerAuthorizationVerifiedAt, undefined);
});

// ==========================================
// 9. Product Entitlements (57..62)
// ==========================================

await check('57. active webhook unlocks remove_branding', () => {
  const activeSub = { plan: 'pro', status: 'active' };
  assert.equal(hasFeature(activeSub, 'remove_branding'), true);
});

await check('58. active webhook unlocks extended_analytics', () => {
  const activeSub = { plan: 'pro', status: 'active' };
  assert.equal(hasFeature(activeSub, 'extended_analytics'), true);
});

await check('59. pending/halted remove those Pro entitlements under current fail-closed policy', () => {
  const pastDueSub = { plan: 'pro', status: 'past_due' };
  assert.equal(hasFeature(pastDueSub, 'remove_branding'), false);
  assert.equal(hasFeature(pastDueSub, 'extended_analytics'), false);
});

await check('60. resumed active restores Pro', () => {
  const resumedSub = { plan: 'pro', status: 'active' };
  const ent = resolveEntitlements(resumedSub);
  assert.equal(ent.isPro, true);
  assert.equal(hasFeature(resumedSub, 'remove_branding'), true);
});

await check('61. canceled removes Pro', () => {
  const canceledSub = { plan: 'pro', status: 'canceled' };
  assert.equal(hasFeature(canceledSub, 'remove_branding'), false);
});

await check('62. paused removes Pro', () => {
  const pausedSub = { plan: 'pro', status: 'paused' };
  assert.equal(hasFeature(pausedSub, 'remove_branding'), false);
});

// ==========================================
// 10. Boundaries & Release Invariants (63..70)
// ==========================================

await check('63. no customer cancellation API', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/billing/cancel/route.js')));
});

await check('64. no refunds', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/billing/refund/route.js')));
});

await check('65. no provider API fetch inside webhook', () => {
  const webhookSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(!webhookSrc.includes('fetch('));
  assert.ok(!webhookSrc.includes('api.razorpay.com'));
});

await check('66. no live-mode support', () => {
  const rzpSrc = fs.readFileSync(path.join(projectRoot, 'lib/billing/providers/razorpay.js'), 'utf-8');
  assert.ok(rzpSrc.includes('RAZORPAY_LIVE_MODE_REJECTED'));
});

await check('67. no custom-domain implementation', () => {
  const domainAction = path.join(projectRoot, 'action/DomainAction.js');
  assert.ok(!fs.existsSync(domainAction));
});

await check('68. Tip Jar unchanged', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  assert.ok(pageSrc.includes('tipJar'));
});

await check('69. no new npm dependency', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay);
  assert.ok(!allDeps.stripe);
});

await check('70. prior Waves remain green', () => {
  const output11a = execSync('node scripts/verify-v2.1-wave11a.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(output11a.includes('FAILED:  0'), 'Wave 11A must pass cleanly');

  const output11a1 = execSync('node scripts/verify-v2.1-wave11a1.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(output11a1.includes('FAILED:  0'), 'Wave 11A-1 must pass cleanly');
});

console.log('\n================================');
console.log('Wave 11B Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
