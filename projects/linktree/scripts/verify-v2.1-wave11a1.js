import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { execSync } from 'node:child_process';

import BillingWebhookEvent from '../models/BillingWebhookEvent.js';
import Subscription from '../models/Subscription.js';
import {
  RAZORPAY_SUBSCRIPTION_EVENTS,
  isSupportedRazorpaySubscriptionEvent,
  verifyRazorpayWebhookSignature,
  extractWebhookSubscriptionMetadata,
} from '../lib/billing/webhook.js';
import { resolveEntitlements } from '../lib/entitlements.js';
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

console.log('--- Running Milestone v2.1 Wave 11A-1: Strict Razorpay Event-ID Idempotency Hardening ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// Mock mongoose connection and models for hermetic execution
mongoose.connect = async () => mongoose.connection;
BillingWebhookEvent.updateOne = async () => ({ modifiedCount: 1 });
BillingWebhookEvent.create = async (doc) => doc;
Subscription.findOne = () => ({ lean: async () => null });

const testWebhookSecret = 'whsec_test_secret_11a1_hardening_abc123';

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
// 1. Strict Event ID Authority & Zero Fallback
// ==========================================

await check('1. x-razorpay-event-id is sole supported-event idempotency authority', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(routeSrc.includes("request.headers.get('x-razorpay-event-id')"));
  assert.ok(!routeSrc.includes('metadata.eventId'));
  assert.ok(!routeSrc.includes('parsedPayload.event_id'));
  assert.ok(!routeSrc.includes('parsedPayload.id'));
});

await check('2. body.event_id is not accepted as fallback', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  let dbCreated = false;
  const origCreate = BillingWebhookEvent.create;
  BillingWebhookEvent.create = async () => {
    dbCreated = true;
  };

  try {
    const req = createSignedRequest({
      headers: {}, // NO x-razorpay-event-id header
      payloadObj: {
        event: 'subscription.activated',
        event_id: 'evt_body_fallback_123', // Body contains event_id
        payload: { subscription: { entity: { id: 'sub_test123' } } },
      },
    });

    const res = await webhookPostHandler(req);
    const data = await res.json();

    assert.equal(res.status, 400, 'Must reject when header is missing even if body.event_id is present');
    assert.equal(data.error, 'MISSING_EVENT_ID');
    assert.equal(dbCreated, false, 'No database record must be written');
  } finally {
    BillingWebhookEvent.create = origCreate;
  }
});

await check('3. body.id is not accepted as fallback', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  let dbCreated = false;
  const origCreate = BillingWebhookEvent.create;
  BillingWebhookEvent.create = async () => {
    dbCreated = true;
  };

  try {
    const req = createSignedRequest({
      headers: {}, // NO header
      payloadObj: {
        id: 'evt_body_id_fallback_456', // Body contains id
        event: 'subscription.charged',
        payload: { subscription: { entity: { id: 'sub_test456' } } },
      },
    });

    const res = await webhookPostHandler(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.error, 'MISSING_EVENT_ID');
    assert.equal(dbCreated, false);
  } finally {
    BillingWebhookEvent.create = origCreate;
  }
});

await check('4. subscription.id is not used as webhook event ID', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  let savedEventId = null;
  const origCreate = BillingWebhookEvent.create;
  BillingWebhookEvent.create = async (doc) => {
    savedEventId = doc.eventId;
    return doc;
  };

  try {
    const req = createSignedRequest({
      headers: { 'x-razorpay-event-id': 'evt_correct_header_789' },
      payloadObj: {
        event: 'subscription.authenticated',
        payload: { subscription: { entity: { id: 'sub_should_not_be_event_id' } } },
      },
    });

    const res = await webhookPostHandler(req);
    assert.equal(res.status, 200);
    assert.equal(savedEventId, 'evt_correct_header_789');
    assert.notEqual(savedEventId, 'sub_should_not_be_event_id');
  } finally {
    BillingWebhookEvent.create = origCreate;
  }
});

await check('5. missing header on supported event causes no ledger write', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  let writeAttempted = false;
  const origCreate = BillingWebhookEvent.create;
  BillingWebhookEvent.create = async () => {
    writeAttempted = true;
  };

  try {
    const req = createSignedRequest({
      headers: {}, // missing header
      payloadObj: {
        event: 'subscription.activated',
        payload: { subscription: { entity: { id: 'sub_test999' } } },
      },
    });

    const res = await webhookPostHandler(req);
    assert.equal(res.status, 400);
    assert.equal(writeAttempted, false);
  } finally {
    BillingWebhookEvent.create = origCreate;
  }
});

await check('6. missing header causes controlled non-2xx', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  const req = createSignedRequest({
    headers: {},
    payloadObj: {
      event: 'subscription.completed',
      payload: { subscription: { entity: { id: 'sub_test111' } } },
    },
  });

  const res = await webhookPostHandler(req);
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.equal(data.error, 'MISSING_EVENT_ID');
});

// ==========================================
// 2. Duplicate Idempotency & Unique Index
// ==========================================

await check('7. duplicate header event remains 2xx/duplicate', async () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
  const origCreate = BillingWebhookEvent.create;
  BillingWebhookEvent.create = async () => {
    const err = new Error('E11000 duplicate key error');
    err.code = 11000;
    throw err;
  };

  try {
    const req = createSignedRequest({
      headers: { 'x-razorpay-event-id': 'evt_duplicate_header_123' },
      payloadObj: {
        event: 'subscription.charged',
        payload: { subscription: { entity: { id: 'sub_dup123' } } },
      },
    });

    const res = await webhookPostHandler(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.received, true);
    assert.equal(data.duplicate, true);
    assert.equal(data.eventId, 'evt_duplicate_header_123');
  } finally {
    BillingWebhookEvent.create = origCreate;
  }
});

await check('8. unique compound index unchanged', () => {
  const indexes = BillingWebhookEvent.schema.indexes();
  const isUniqueCompound = indexes.some(
    ([spec, opts]) => spec.provider === 1 && spec.eventId === 1 && opts?.unique === true
  );
  assert.ok(isUniqueCompound, 'BillingWebhookEvent schema must have unique index on { provider: 1, eventId: 1 }');
});

// ==========================================
// 3. Security & Ordering Invariants
// ==========================================

await check('9. signature still verified before JSON parse', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  const verifyPos = routeSrc.indexOf('verifyRazorpayWebhookSignature');
  const jsonParsePos = routeSrc.indexOf('JSON.parse');
  assert.ok(verifyPos < jsonParsePos, 'verifyRazorpayWebhookSignature must occur before JSON.parse');
});

await check('10. valid signature still uses raw body', () => {
  const raw = '{"event":"subscription.activated","payload":{}}';
  const sig = crypto.createHmac('sha256', testWebhookSecret).update(raw).digest('hex');
  const valid = verifyRazorpayWebhookSignature({
    rawBody: raw,
    signature: sig,
    secret: testWebhookSecret,
  });
  assert.equal(valid, true);
});

await check('11. webhook secret remains server-only', () => {
  const clientFiles = [
    'components/billing/BillingClient.js',
    'components/billing/RazorpayTestCheckoutButton.js',
    'lib/billingPresentation.js',
  ];
  for (const f of clientFiles) {
    const content = fs.readFileSync(path.join(projectRoot, f), 'utf-8');
    assert.ok(!content.includes('RAZORPAY_WEBHOOK_SECRET'));
    assert.ok(!content.includes('BillingWebhookEvent'));
  }
});

// ==========================================
// 4. Zero Entitlement / Lifecycle Mutation
// ==========================================

await check('12. no Subscription mutation', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(!routeSrc.includes('Subscription.updateOne'));
  assert.ok(!routeSrc.includes('Subscription.findOneAndUpdate'));
  assert.ok(!routeSrc.includes('Subscription.create'));
});

await check('13. no Pro activation', () => {
  const incompleteSub = {
    plan: 'pro',
    status: 'incomplete',
    provider: 'razorpay',
    providerSubscriptionId: 'sub_activeOnRazorpayOnly',
  };
  const ent = resolveEntitlements(incompleteSub);
  assert.equal(ent.isPro, false);
  assert.equal(ent.plan, 'free');
});

await check('14. no Razorpay API fetch', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(!routeSrc.includes('fetch('));
  assert.ok(!routeSrc.includes('api.razorpay.com'));
});

// ==========================================
// 5. Cross-Wave Regressions
// ==========================================

await check('15. Wave 11A remains green', () => {
  const output = execSync('node scripts/verify-v2.1-wave11a.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(output.includes('FAILED:  0'), 'Wave 11A must pass cleanly');
});

await check('16. V2 regression/build remains green', () => {
  const output10 = execSync('node scripts/verify-v2.1-wave10.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(output10.includes('FAILED:  0'));

  const output10a = execSync('node scripts/verify-v2.1-wave10a.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(output10a.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 11A-1 Hardening Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
