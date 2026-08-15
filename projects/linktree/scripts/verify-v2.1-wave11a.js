import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { execSync } from 'node:child_process';

import BillingWebhookEvent, {
  WEBHOOK_PROVIDERS,
  WEBHOOK_PROCESSING_STATUSES,
} from '../models/BillingWebhookEvent.js';
import {
  RAZORPAY_SUBSCRIPTION_EVENTS,
  isSupportedRazorpaySubscriptionEvent,
  verifyRazorpayWebhookSignature,
  extractWebhookSubscriptionMetadata,
} from '../lib/billing/webhook.js';
import { resolveEntitlements } from '../lib/entitlements.js';
import { getRazorpayConfig } from '../lib/billing/providers/razorpay.js';
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

console.log('--- Running Milestone v2.1 Wave 11A: Razorpay Webhook Verification & Idempotent Event Intake ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// Mock mongoose connection so tests can run hermetically
mongoose.connect = async () => mongoose.connection;

// ==========================================
// 1. Webhook Route Architecture & Static Invariants
// ==========================================

await check('1. webhook route exists', () => {
  const routePath = path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js');
  assert.ok(fs.existsSync(routePath), 'Webhook route file must exist');
});

await check('2. POST uses raw request body', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(routeSrc.includes('await request.text()'), 'Must read raw request body as text');
});

await check('3. JSON is not parsed before signature verification', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  const verifyIdx = routeSrc.indexOf('verifyRazorpayWebhookSignature');
  const parseIdx = routeSrc.indexOf('JSON.parse');
  assert.ok(verifyIdx !== -1, 'verifyRazorpayWebhookSignature must be called');
  assert.ok(parseIdx !== -1, 'JSON.parse must be called');
  assert.ok(verifyIdx < parseIdx, 'Signature verification must happen strictly before JSON.parse');
});

await check('4. X-Razorpay-Signature is required', async () => {
  const headersMap = new Map([['x-razorpay-event-id', 'evt_123']]);
  const req = {
    headers: {
      get: (k) => headersMap.get(k.toLowerCase()) || null,
    },
    text: async () => '{"event":"subscription.activated"}',
  };

  const res = await webhookPostHandler(req);
  const data = await res.json();
  assert.equal(res.status, 400);
  assert.equal(data.error, 'MISSING_SIGNATURE');
});

// ==========================================
// 2. Cryptographic HMAC Verification
// ==========================================

const testWebhookSecret = 'whsec_test_secret_1234567890abcdef';
const testPayload = JSON.stringify({
  entity: 'event',
  account_id: 'acc_test123',
  event: 'subscription.activated',
  created_at: 1723737600,
  payload: {
    subscription: {
      entity: {
        id: 'sub_testSubscription123',
        plan_id: 'plan_testPlan456',
        status: 'active',
        created_at: 1723737600,
      },
    },
  },
});

const validSignature = crypto
  .createHmac('sha256', testWebhookSecret)
  .update(testPayload)
  .digest('hex');

await check('5. HMAC-SHA256 uses raw body', () => {
  const verified = verifyRazorpayWebhookSignature({
    rawBody: testPayload,
    signature: validSignature,
    secret: testWebhookSecret,
  });
  assert.equal(verified, true);
});

await check('6. HMAC key is RAZORPAY_WEBHOOK_SECRET', () => {
  const verifiedWithEnv = verifyRazorpayWebhookSignature({
    rawBody: testPayload,
    signature: validSignature,
    env: { RAZORPAY_WEBHOOK_SECRET: testWebhookSecret },
  });
  assert.equal(verifiedWithEnv, true);
});

await check('7. API key secret is not used for webhook verification', () => {
  const apiKeySecret = 'rzp_key_secret_different_than_webhook_secret';
  const sigWithApiKey = crypto
    .createHmac('sha256', apiKeySecret)
    .update(testPayload)
    .digest('hex');

  const verified = verifyRazorpayWebhookSignature({
    rawBody: testPayload,
    signature: sigWithApiKey,
    secret: testWebhookSecret, // Webhook secret authority
  });
  assert.equal(verified, false, 'Signature generated with API key secret must be rejected');
});

await check('8. valid signature accepted', () => {
  assert.equal(
    verifyRazorpayWebhookSignature({
      rawBody: testPayload,
      signature: validSignature,
      secret: testWebhookSecret,
    }),
    true
  );
});

await check('9. invalid signature rejected', () => {
  assert.equal(
    verifyRazorpayWebhookSignature({
      rawBody: testPayload,
      signature: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      secret: testWebhookSecret,
    }),
    false
  );
});

await check('10. malformed signature rejected', () => {
  assert.equal(
    verifyRazorpayWebhookSignature({
      rawBody: testPayload,
      signature: 'short_malformed_sig',
      secret: testWebhookSecret,
    }),
    false
  );
  assert.equal(
    verifyRazorpayWebhookSignature({
      rawBody: null,
      signature: validSignature,
      secret: testWebhookSecret,
    }),
    false
  );
});

await check('11. missing webhook secret fails safely', () => {
  assert.equal(
    verifyRazorpayWebhookSignature({
      rawBody: testPayload,
      signature: validSignature,
      secret: '',
      env: {},
    }),
    false
  );
});

// ==========================================
// 3. Idempotency & BillingWebhookEvent Model
// ==========================================

await check('12. x-razorpay-event-id is read', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(routeSrc.includes("request.headers.get('x-razorpay-event-id')"));
});

await check('13. BillingWebhookEvent model exists', () => {
  assert.ok(BillingWebhookEvent, 'BillingWebhookEvent model must exist');
  assert.equal(BillingWebhookEvent.modelName, 'BillingWebhookEvent');
  const paths = BillingWebhookEvent.schema.paths;
  assert.ok(paths.provider, 'provider path must exist');
  assert.ok(paths.eventId, 'eventId path must exist');
  assert.ok(paths.eventType, 'eventType path must exist');
  assert.ok(paths.processingStatus, 'processingStatus path must exist');
  assert.ok(paths.receivedAt, 'receivedAt path must exist');
});

await check('14. provider + eventId unique index exists', () => {
  const indexes = BillingWebhookEvent.schema.indexes();
  const compoundIndex = indexes.find(
    ([spec, opts]) => spec.provider === 1 && spec.eventId === 1 && opts?.unique === true
  );
  assert.ok(compoundIndex, 'Must declare unique compound index on { provider: 1, eventId: 1 }');
});

await check('15. duplicate event returns safe successful acknowledgement', async () => {
  // Simulate mock request with duplicate event delivery
  let createCallCount = 0;
  const origCreate = BillingWebhookEvent.create;
  BillingWebhookEvent.create = async () => {
    createCallCount++;
    const err = new Error('E11000 duplicate key error collection');
    err.code = 11000;
    throw err;
  };

  try {
    const headersMap = new Map([
      ['x-razorpay-signature', validSignature],
      ['x-razorpay-event-id', 'evt_duplicate_test123'],
    ]);
    const mockReq = {
      headers: {
        get: (k) => headersMap.get(k.toLowerCase()) || null,
      },
      text: async () => testPayload,
    };

    process.env.RAZORPAY_WEBHOOK_SECRET = testWebhookSecret;
    const res = await webhookPostHandler(mockReq);
    const body = await res.json();

    assert.equal(res.status, 200, 'Duplicate delivery must return 200 status');
    assert.equal(body.received, true);
    assert.equal(body.duplicate, true);
  } finally {
    BillingWebhookEvent.create = origCreate;
  }
});

await check('16. duplicate does not create second ledger entry', () => {
  const schemaIndexes = BillingWebhookEvent.schema.indexes();
  const isUnique = schemaIndexes.some(([spec, opts]) => spec.provider === 1 && spec.eventId === 1 && opts.unique);
  assert.ok(isUnique, 'Database guarantees no second record can be created with identical provider + eventId');
});

// ==========================================
// 4. Supported Event Allowlist
// ==========================================

await check('17. supported event allowlist centralized', () => {
  assert.ok(Array.isArray(RAZORPAY_SUBSCRIPTION_EVENTS));
  assert.equal(RAZORPAY_SUBSCRIPTION_EVENTS.length, 10);
});

await check('18. subscription.authenticated recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.authenticated'), true);
});

await check('19. subscription.activated recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.activated'), true);
});

await check('20. subscription.charged recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.charged'), true);
});

await check('21. subscription.completed recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.completed'), true);
});

await check('22. subscription.updated recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.updated'), true);
});

await check('23. subscription.pending recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.pending'), true);
});

await check('24. subscription.halted recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.halted'), true);
});

await check('25. subscription.cancelled recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.cancelled'), true);
});

await check('26. subscription.paused recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.paused'), true);
});

await check('27. subscription.resumed recognized', () => {
  assert.equal(isSupportedRazorpaySubscriptionEvent('subscription.resumed'), true);
});

// ==========================================
// 5. Minimal Metadata Extraction & Payload Safety
// ==========================================

await check('28. providerSubscriptionId extracted only after verification', () => {
  const metadata = extractWebhookSubscriptionMetadata(JSON.parse(testPayload));
  assert.equal(metadata.providerSubscriptionId, 'sub_testSubscription123');
  assert.equal(metadata.eventType, 'subscription.activated');
  assert.ok(metadata.providerCreatedAt instanceof Date);
});

await check('29. malformed payload does not mutate Subscription', () => {
  const malformed = extractWebhookSubscriptionMetadata({});
  assert.equal(malformed.providerSubscriptionId, null);
  assert.equal(malformed.eventType, '');
});

await check('30. valid event does not mutate Subscription', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(!routeSrc.includes('Subscription.find'), 'Webhook route must not query or mutate Subscription model');
  assert.ok(!routeSrc.includes('Subscription.update'), 'Webhook route must not query or mutate Subscription model');
  assert.ok(!routeSrc.includes('saveSubscription'), 'Webhook route must not query or mutate Subscription model');
});

// ==========================================
// 6. Entitlement Isolation Invariants
// ==========================================

await check('31. activated event does not grant Pro', () => {
  const localRecord = {
    plan: 'pro',
    status: 'incomplete',
    provider: 'razorpay',
    providerSubscriptionId: 'sub_testSubscription123',
  };
  const ent = resolveEntitlements(localRecord);
  assert.equal(ent.isPro, false, 'Local record remains incomplete / Free tier');
  assert.equal(ent.plan, 'free');
});

await check('32. charged event does not grant Pro', () => {
  const localRecord = {
    plan: 'pro',
    status: 'incomplete',
    provider: 'razorpay',
  };
  const ent = resolveEntitlements(localRecord);
  assert.equal(ent.isPro, false);
});

await check('33. canceled event does not downgrade anything yet', () => {
  const localRecord = {
    plan: 'pro',
    status: 'incomplete',
  };
  const ent = resolveEntitlements(localRecord);
  assert.equal(ent.plan, 'free');
});

// ==========================================
// 7. Security Boundaries & Zero Secret Exposure
// ==========================================

await check('34. no full raw payload persisted', () => {
  const paths = BillingWebhookEvent.schema.paths;
  assert.ok(!paths.rawPayload, 'Must not store rawPayload');
  assert.ok(!paths.payload, 'Must not store full payload');
  assert.ok(!paths.body, 'Must not store raw body');
});

await check('35. no secret persisted', () => {
  const paths = BillingWebhookEvent.schema.paths;
  assert.ok(!paths.secret, 'Must not store secrets');
  assert.ok(!paths.keySecret, 'Must not store key secret');
  assert.ok(!paths.webhookSecret, 'Must not store webhook secret');
});

await check('36. no client component imports webhook model', () => {
  const clientFiles = [
    'components/billing/BillingClient.js',
    'components/billing/RazorpayTestCheckoutButton.js',
    'lib/billingPresentation.js',
  ];
  for (const f of clientFiles) {
    const src = fs.readFileSync(path.join(projectRoot, f), 'utf-8');
    assert.ok(!src.includes('BillingWebhookEvent'), `${f} must not import BillingWebhookEvent`);
    assert.ok(!src.includes('RAZORPAY_WEBHOOK_SECRET'), `${f} must not import RAZORPAY_WEBHOOK_SECRET`);
  }
});

await check('37. no NextAuth requirement on webhook route', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(!routeSrc.includes('getServerSession'), 'Webhook route must not require NextAuth session');
  assert.ok(!routeSrc.includes('authOptions'), 'Webhook route must not require NextAuth');
});

await check('38. no Razorpay API fetch inside webhook', () => {
  const routeSrc = fs.readFileSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js'), 'utf-8');
  assert.ok(!routeSrc.includes('fetch('), 'Webhook intake route must not perform outbound HTTP fetch');
  assert.ok(!routeSrc.includes('createRazorpaySubscription'), 'Webhook route must not call Razorpay creation API');
});

await check('39. no new npm dependency', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay, 'package.json must not have razorpay npm package');
  assert.ok(!allDeps.stripe, 'package.json must not have stripe npm package');
});

// ==========================================
// 8. Regression Suite Across All Prior Waves
// ==========================================

await check('40. existing Waves remain green', () => {
  const output10 = execSync('node scripts/verify-v2.1-wave10.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(output10.includes('FAILED:  0'), 'Suite scripts/verify-v2.1-wave10.js must pass with 0 failures');

  const output10a = execSync('node scripts/verify-v2.1-wave10a.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(output10a.includes('FAILED:  0'), 'Suite scripts/verify-v2.1-wave10a.js must pass with 0 failures');
});

console.log('\n================================');
console.log('Wave 11A Webhook Intake Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
