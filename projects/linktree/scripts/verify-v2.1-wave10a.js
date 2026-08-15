import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { execSync } from 'node:child_process';

import {
  formatBillingPresentation,
  FREE_BASELINE_FEATURES,
  PRO_ROADMAP_FEATURES,
} from '../lib/billingPresentation.js';
import { resolveEntitlements } from '../lib/entitlements.js';
import {
  getRazorpayConfig,
  createRazorpaySubscription,
  verifyRazorpaySubscriptionSignature,
} from '../lib/billing/providers/razorpay.js';
import {
  saveRazorpayPendingSubscriptionByUserId,
} from '../lib/subscriptionRepository.js';

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

console.log('--- Running Milestone v2.1 Wave 10A: Client Billing Identifier Hardening & Test Checkout Readiness ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Billing Presentation & Props Hardening
// ==========================================

const dirtySubscription = {
  _id: '60d5ec49f1b2c8a1b8e4f1a1',
  userId: '60d5ec49f1b2c8a1b8e4f1a2',
  plan: 'pro',
  status: 'incomplete',
  provider: 'razorpay',
  providerCustomerId: 'cust_secret_12345',
  providerSubscriptionId: 'sub_secret_67890',
  currentPeriodEnd: new Date('2026-12-31T00:00:00Z'),
  cancelAtPeriodEnd: false,
  secretKey: 'rzp_secret_should_never_leak',
};

const entitlements = resolveEntitlements(dirtySubscription);
const presentation = formatBillingPresentation(entitlements, dirtySubscription);

await check('1. billingPresentation does not expose providerSubscriptionId', () => {
  assert.strictEqual(presentation.providerSubscriptionId, undefined);
  assert.ok(!JSON.stringify(presentation).includes('sub_secret_67890'));
});

await check('2. billingPresentation does not expose providerCustomerId', () => {
  assert.strictEqual(presentation.providerCustomerId, undefined);
  assert.ok(!JSON.stringify(presentation).includes('cust_secret_12345'));
});

await check('3. BillingClient initial props contain no provider IDs', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/dashboard/billing/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('<BillingClient presentation={presentation} />'));
  assert.ok(!pageSrc.includes('providerSubscriptionId'));
  assert.ok(!pageSrc.includes('providerCustomerId'));
  assert.ok(!pageSrc.includes('subscription={subscription}'));
});

await check('4. raw Subscription is not passed to Client Components', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/dashboard/billing/page.js'), 'utf-8');
  assert.ok(!pageSrc.includes('subscription={'));
  assert.ok(!pageSrc.includes('rawSubscription'));
  assert.strictEqual(presentation._id, undefined);
  assert.strictEqual(presentation.userId, undefined);
  assert.strictEqual(presentation.secretKey, undefined);
});

await check('5. pending Razorpay state can still be represented in UI using safe derived fields', () => {
  assert.equal(presentation.effectivePlan, 'free');
  assert.equal(presentation.displayStatus, 'Free Account');
  assert.equal(presentation.statusBadge, 'Setup Incomplete');
  assert.equal(presentation.statusVariant, 'amber');
  assert.equal(presentation.isPro, false);
});

// ==========================================
// 2. Temporary Checkout Exception & Server Authority
// ==========================================

await check('6. createRazorpayTestCheckoutAction can return temporary subscriptionId', () => {
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  assert.ok(actionSrc.includes('subscriptionId: createdSub.subscriptionId'));
  assert.ok(actionSrc.includes('subscriptionId: existingSub.providerSubscriptionId'));
});

await check('7. temporary subscriptionId is derived server-side', () => {
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  assert.ok(actionSrc.includes('createRazorpaySubscription({'));
  assert.ok(actionSrc.includes('userId: normalizedUserId.toString()'));
});

await check('8. client cannot supply subscriptionId during checkout creation', () => {
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  // createRazorpayTestCheckoutAction accepts 0 client arguments
  assert.ok(actionSrc.includes('export async function createRazorpayTestCheckoutAction() {'));
});

await check('9. pending retry retrieves providerSubscriptionId server-side', () => {
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  assert.ok(actionSrc.includes('existingSub.status === \'incomplete\''));
  assert.ok(actionSrc.includes('existingSub.providerSubscriptionId'));
  assert.ok(actionSrc.includes('subscriptionId: existingSub.providerSubscriptionId'));
});

await check('10. Key Secret never reaches Client Component', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/BillingClient.js'), 'utf-8');
  const btnSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/RazorpayTestCheckoutButton.js'), 'utf-8');
  const presSrc = fs.readFileSync(path.join(projectRoot, 'lib/billingPresentation.js'), 'utf-8');

  assert.ok(!clientSrc.includes('RAZORPAY_KEY_SECRET'));
  assert.ok(!btnSrc.includes('RAZORPAY_KEY_SECRET'));
  assert.ok(!presSrc.includes('RAZORPAY_KEY_SECRET'));
});

await check('11. Plan ID never reaches client authority', () => {
  const btnSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/RazorpayTestCheckoutButton.js'), 'utf-8');
  assert.ok(!btnSrc.includes('plan_id'));
  assert.ok(!btnSrc.includes('RAZORPAY_PRO_MONTHLY_PLAN_ID'));
});

await check('12. amount remains provider Plan authority', () => {
  const btnSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/RazorpayTestCheckoutButton.js'), 'utf-8');
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  // Neither button nor action passes custom amount or overrides plan pricing
  assert.ok(!btnSrc.includes('amount:'));
  assert.ok(!actionSrc.includes('amount:'));
});

await check('13. signature verification still compares against stored server-side subscription ID', () => {
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  assert.ok(actionSrc.includes('localSub.providerSubscriptionId !== razorpay_subscription_id.trim()'));
  assert.ok(actionSrc.includes('subscriptionId: localSub.providerSubscriptionId'));
});

// ==========================================
// 3. Pro Entitlement Invariants & Safety
// ==========================================

await check('14. signature verification does not activate Pro', () => {
  const actionSrc = fs.readFileSync(path.join(projectRoot, 'action/BillingAction.js'), 'utf-8');
  // Ensure verifyRazorpayTestCheckoutAction does not mutate subscription status to active
  assert.ok(!actionSrc.includes('status = \'active\''));
  assert.ok(!actionSrc.includes('status: \'active\''));
});

await check('15. checkout success does not activate Pro', () => {
  const pendingRecord = {
    plan: 'pro',
    status: 'incomplete',
    provider: 'razorpay',
    providerSubscriptionId: 'sub_test_123',
  };
  const resolved = resolveEntitlements(pendingRecord);
  assert.equal(resolved.isPro, false);
  assert.equal(resolved.plan, 'free');
  assert.equal(resolved.features.remove_branding, false);
  assert.equal(resolved.features.extended_analytics, false);
});

await check('16. live Razorpay key remains rejected', () => {
  assert.throws(
    () => getRazorpayConfig({
      RAZORPAY_KEY_ID: 'rzp_live_1234567890abcdef',
      RAZORPAY_KEY_SECRET: 'secret',
      RAZORPAY_PRO_MONTHLY_PLAN_ID: 'plan_123',
    }),
    (err) => err.code === 'RAZORPAY_LIVE_MODE_REJECTED'
  );
});

// ==========================================
// 4. Boundaries & Clean Architecture
// ==========================================

await check('17. no legacy webhook route exists', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/webhook/razorpay/route.js')));
});

await check('18. no webhook secret exists in config resolver', () => {
  const rzpSrc = fs.readFileSync(path.join(projectRoot, 'lib/billing/providers/razorpay.js'), 'utf-8');
  assert.ok(!rzpSrc.includes('RAZORPAY_WEBHOOK_SECRET'));
});

await check('19. no schema change', () => {
  const subSrc = fs.readFileSync(path.join(projectRoot, 'models/Subscription.js'), 'utf-8');
  assert.ok(!subSrc.includes('isPro:'));
  assert.ok(subSrc.includes('default: PLAN_IDS.FREE'));
});

await check('20. no npm dependency', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay);
  assert.ok(!allDeps.stripe);
});

console.log('\n================================');
console.log('Wave 10A Hardening Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
