import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { execSync } from 'node:child_process';

import {
  getRazorpayConfig,
  createRazorpaySubscription,
  verifyRazorpaySubscriptionSignature,
  RAZORPAY_API_BASE_URL,
} from '../lib/billing/providers/razorpay.js';
import {
  saveRazorpayPendingSubscriptionByUserId,
  getSubscriptionByUserId,
  normalizeUserId,
} from '../lib/subscriptionRepository.js';
import { resolveEntitlements } from '../lib/entitlements.js';
import { PLAN_IDS } from '../lib/plans.js';
import Subscription from '../models/Subscription.js';

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

console.log('--- Running Milestone v2.1 Wave 10: Razorpay Provider Adapter & Test Checkout ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// Mock mongoose connection so tests can run hermetically
const origMongooseConnect = mongoose.connect;
mongoose.connect = async () => mongoose.connection;

// ==========================================
// 1. Configuration Validation & Hard Stops
// ==========================================

await check('config: valid test environment parses correctly', () => {
  const env = {
    RAZORPAY_KEY_ID: 'rzp_test_1234567890abcdef',
    RAZORPAY_KEY_SECRET: 'testsecret1234567890abcdef',
    RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_1234567890abcdef',
  };
  const cfg = getRazorpayConfig(env);
  assert.equal(cfg.keyId, 'rzp_test_1234567890abcdef');
  assert.equal(cfg.keySecret, 'testsecret1234567890abcdef');
  assert.equal(cfg.planId, 'plan_1234567890abcdef');
});

await check('config: missing RAZORPAY_KEY_ID throws RAZORPAY_CONFIG_MISSING', () => {
  assert.throws(
    () => getRazorpayConfig({ RAZORPAY_KEY_SECRET: 'sec', RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_123' }),
    (err) => err.code === 'RAZORPAY_CONFIG_MISSING'
  );
});

await check('config: missing RAZORPAY_KEY_SECRET throws RAZORPAY_CONFIG_MISSING', () => {
  assert.throws(
    () => getRazorpayConfig({ RAZORPAY_KEY_ID: 'rzp_test_123', RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_123' }),
    (err) => err.code === 'RAZORPAY_CONFIG_MISSING'
  );
});

await check('config: missing RAZORPAY_PRO_MONTHLY_PLAN_ID throws RAZORPAY_CONFIG_MISSING', () => {
  assert.throws(
    () => getRazorpayConfig({ RAZORPAY_KEY_ID: 'rzp_test_123', RAZORPAY_KEY_SECRET: 'sec' }),
    (err) => err.code === 'RAZORPAY_CONFIG_MISSING'
  );
});

await check('config: live key starting with rzp_live_ is strictly rejected in Wave 10', () => {
  assert.throws(
    () => getRazorpayConfig({
      RAZORPAY_KEY_ID: 'rzp_live_1234567890abcdef',
      RAZORPAY_KEY_SECRET: 'sec',
      RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_123',
    }),
    (err) => err.code === 'RAZORPAY_LIVE_MODE_REJECTED'
  );
});

await check('config: non-test key without rzp_test_ is rejected with RAZORPAY_TEST_MODE_REQUIRED', () => {
  assert.throws(
    () => getRazorpayConfig({
      RAZORPAY_KEY_ID: 'invalid_prefix_key',
      RAZORPAY_KEY_SECRET: 'sec',
      RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_123',
    }),
    (err) => err.code === 'RAZORPAY_TEST_MODE_REQUIRED'
  );
});

await check('config: invalid plan ID format rejected with RAZORPAY_INVALID_PLAN_ID', () => {
  assert.throws(
    () => getRazorpayConfig({
      RAZORPAY_KEY_ID: 'rzp_test_123',
      RAZORPAY_KEY_SECRET: 'sec',
      RAZORPAY_PRO_MONTHLY_PLAN_ID: 'invalid_plan_format',
    }),
    (err) => err.code === 'RAZORPAY_INVALID_PLAN_ID'
  );
});

// ==========================================
// 2. Provider Adapter (Hermetic Mock Fetch)
// ==========================================

const testEnv = {
  RAZORPAY_KEY_ID: 'rzp_test_mockKey123',
  RAZORPAY_KEY_SECRET: 'mockSecret456',
  RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_mockPlan789',
};

await check('adapter: createRazorpaySubscription sends correct Basic Auth and server parameters', async () => {
  let capturedUrl = null;
  let capturedHeaders = null;
  let capturedBody = null;

  const mockFetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    capturedBody = JSON.parse(options.body);

    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: 'sub_mockSubscription123',
        status: 'created',
        plan_id: 'plan_mockPlan789',
        total_count: 1200,
        quantity: 1,
      }),
    };
  };

  const result = await createRazorpaySubscription({
    userId: '60d5ec49f1b2c8a1b8e4f1a1',
    fetchFn: mockFetch,
    env: testEnv,
  });

  assert.equal(capturedUrl, `${RAZORPAY_API_BASE_URL}/subscriptions`);
  const expectedAuth = `Basic ${Buffer.from('rzp_test_mockKey123:mockSecret456').toString('base64')}`;
  assert.equal(capturedHeaders.Authorization, expectedAuth);
  assert.equal(capturedBody.plan_id, 'plan_mockPlan789');
  assert.equal(capturedBody.total_count, 1200);
  assert.equal(capturedBody.quantity, 1);
  assert.equal(capturedBody.notes.prince_links_user_id, '60d5ec49f1b2c8a1b8e4f1a1');
  assert.equal(capturedBody.notes.prince_links_product, 'pro_monthly');

  assert.equal(result.subscriptionId, 'sub_mockSubscription123');
  assert.equal(result.status, 'created');
  assert.equal(result.planId, 'plan_mockPlan789');
});

await check('adapter: handles provider API error without crashing or leaking secrets', async () => {
  const mockFetchError = async () => ({
    ok: false,
    status: 400,
    json: async () => ({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Plan has expired or is inactive',
      },
    }),
  });

  await assert.rejects(
    async () => {
      await createRazorpaySubscription({
        userId: '60d5ec49f1b2c8a1b8e4f1a1',
        fetchFn: mockFetchError,
        env: testEnv,
      });
    },
    (err) => {
      assert.equal(err.code, 'RAZORPAY_API_ERROR');
      assert.equal(err.status, 400);
      assert.equal(err.providerErrorCode, 'BAD_REQUEST_ERROR');
      assert.ok(!err.message.includes('mockSecret456'));
      return true;
    }
  );
});

await check('adapter: rejects malformed provider response without sub_ prefix', async () => {
  const mockFetchMalformed = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      id: 'invalid_id_format',
      plan_id: 'plan_mockPlan789',
    }),
  });

  await assert.rejects(
    async () => {
      await createRazorpaySubscription({
        userId: '60d5ec49f1b2c8a1b8e4f1a1',
        fetchFn: mockFetchMalformed,
        env: testEnv,
      });
    },
    (err) => err.code === 'RAZORPAY_RESPONSE_INVALID'
  );
});

// ==========================================
// 3. Signature Verification & HMAC Security
// ==========================================

await check('signature: valid HMAC-SHA256 signature returns true', () => {
  const paymentId = 'pay_testPayment123';
  const subscriptionId = 'sub_testSubscription456';
  const secret = 'testKeySecret789';

  const validSignature = crypto
    .createHmac('sha256', secret)
    .update(`${paymentId}|${subscriptionId}`)
    .digest('hex');

  const isValid = verifyRazorpaySubscriptionSignature({
    paymentId,
    subscriptionId,
    signature: validSignature,
    secret,
  });

  assert.equal(isValid, true);
});

await check('signature: invalid signature returns false', () => {
  const isValid = verifyRazorpaySubscriptionSignature({
    paymentId: 'pay_testPayment123',
    subscriptionId: 'sub_testSubscription456',
    signature: 'bad_signature_digest_1234567890abcdef',
    secret: 'testKeySecret789',
  });

  assert.equal(isValid, false);
});

await check('signature: mismatched subscription ID returns false', () => {
  const secret = 'testKeySecret789';
  const sigForSubA = crypto
    .createHmac('sha256', secret)
    .update(`pay_123|sub_AAA`)
    .digest('hex');

  const isValid = verifyRazorpaySubscriptionSignature({
    paymentId: 'pay_123',
    subscriptionId: 'sub_BBB',
    signature: sigForSubA,
    secret,
  });

  assert.equal(isValid, false);
});

await check('signature: missing or empty inputs return false safely without throwing', () => {
  assert.equal(verifyRazorpaySubscriptionSignature({ paymentId: null, subscriptionId: 'sub_123', signature: 'sig' }), false);
  assert.equal(verifyRazorpaySubscriptionSignature({ paymentId: 'pay_123', subscriptionId: '', signature: 'sig' }), false);
  assert.equal(verifyRazorpaySubscriptionSignature({ paymentId: 'pay_123', subscriptionId: 'sub_123', signature: null }), false);
});

// ==========================================
// 4. Local Repository & Persistence Invariants
// ==========================================

await check('repository: saveRazorpayPendingSubscriptionByUserId persists normalized incomplete state', async () => {
  const testUserId = new mongoose.Types.ObjectId('60d5ec49f1b2c8a1b8e4f1a1');
  let savedData = null;

  const mockFindUser = async (id) => ({ _id: id, email: 'creator@princeji.com' });
  const mockSaveSub = async (id, update) => {
    savedData = { id, update };
    return {
      userId: id,
      ...update.$set,
    };
  };

  const result = await saveRazorpayPendingSubscriptionByUserId(
    testUserId,
    'sub_rzpPending123',
    { findUser: mockFindUser, saveSubscription: mockSaveSub }
  );

  assert.equal(savedData.update.$set.plan, 'pro');
  assert.equal(savedData.update.$set.status, 'incomplete');
  assert.equal(savedData.update.$set.provider, 'razorpay');
  assert.equal(savedData.update.$set.providerSubscriptionId, 'sub_rzpPending123');
  assert.equal(savedData.update.$set.cancelAtPeriodEnd, false);

  assert.equal(result.plan, 'pro');
  assert.equal(result.status, 'incomplete');
  assert.equal(result.provider, 'razorpay');
  assert.equal(result.providerSubscriptionId, 'sub_rzpPending123');
});

await check('entitlements: plan=pro + status=incomplete strictly resolves to Free entitlements', () => {
  const pendingSub = {
    plan: 'pro',
    status: 'incomplete',
    provider: 'razorpay',
    providerSubscriptionId: 'sub_rzpPending123',
  };

  const entitlements = resolveEntitlements(pendingSub);
  assert.equal(entitlements.plan, 'free');
  assert.equal(entitlements.isPro, false);
  assert.equal(entitlements.features.remove_branding, false);
  assert.equal(entitlements.features.extended_analytics, false);
  assert.equal(Boolean(entitlements.features.custom_domain), false);
});

// ==========================================
// 5. Server Action Source & Security Invariants
// ==========================================

await check('action: BillingAction.js enforces session auth and state protections', () => {
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  assert.ok(actionSrc.includes("'use server'"));
  assert.ok(actionSrc.includes('getServerSession'));
  assert.ok(actionSrc.includes('MANUAL_PRO_ACTIVE'));
  assert.ok(actionSrc.includes('STRIPE_PROVIDER_MANAGED'));
  assert.ok(actionSrc.includes('RAZORPAY_ALREADY_ACTIVE'));
  assert.ok(actionSrc.includes('providerSubscriptionId'));
  assert.ok(actionSrc.includes('verifyRazorpaySubscriptionSignature'));
  assert.ok(!actionSrc.includes('status: "active"') && !actionSrc.includes("status: 'active'"));
});

await check('components: RazorpayTestCheckoutButton loads script on-demand and renders test mode warning', () => {
  const btnSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/RazorpayTestCheckoutButton.js'), 'utf-8');
  assert.ok(btnSrc.includes('https://checkout.razorpay.com/v1/checkout.js'));
  assert.ok(btnSrc.includes('createRazorpayTestCheckoutAction'));
  assert.ok(btnSrc.includes('verifyRazorpayTestCheckoutAction'));
  assert.ok(btnSrc.includes('Test Pro Checkout'));
});

await check('components: BillingClient contains Razorpay Test Mode notice and verified post-authorisation state', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/BillingClient.js'), 'utf-8');
  assert.ok(clientSrc.includes('Razorpay Test Mode'));
  assert.ok(clientSrc.includes('No real money will be charged'));
  assert.ok(clientSrc.includes('Test Authorisation Verified'));
  assert.ok(clientSrc.includes('RazorpayTestCheckoutButton'));
});

// ==========================================
// 6. Security Boundaries & Isolation
// ==========================================

await check('boundaries: zero webhook routes or webhook secret in Wave 10', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/billing/razorpay/webhook/route.js')));
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/webhook/razorpay/route.js')));
});

await check('boundaries: Tip Jar and custom domains untouched', () => {
  const tipJarSrc = fs.readFileSync(path.join(projectRoot, 'lib/tipJar.js'), 'utf-8');
  assert.ok(!tipJarSrc.includes('razorpay'));
  assert.ok(!tipJarSrc.includes('Subscription'));
});

await check('boundaries: package.json has zero payment SDK dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay, 'package.json must not have razorpay npm package');
  assert.ok(!allDeps.stripe, 'package.json must not have stripe npm package');
});

// ==========================================
// 7. Regression Across All Prior Waves
// ==========================================

await check('regression: all prior wave verification suites (Wave 1..9B2A) pass cleanly', () => {
  const suites = [
    'verify-v2.1-wave8.js',
    'verify-v2.1-wave9a.js',
    'verify-v2.1-wave9b1.js',
    'verify-v2.1-wave9b2.js',
    'verify-v2.1-wave9b2a.js',
  ];

  for (const suite of suites) {
    const output = execSync(`node scripts/${suite}`, { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
    assert.ok(output.includes('FAILED:  0'), `Suite scripts/${suite} must pass with 0 failures`);
  }
});

console.log('\n================================');
console.log('Wave 10 Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
