import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { PLAN_IDS, FEATURE_KEYS, PLANS, isValidPlan, isValidFeature } from '../lib/plans.js';
import {
  getEffectivePlan,
  resolveEntitlements,
  hasFeature,
  ENTITLED_STATUSES,
  NON_ENTITLED_STATUSES,
} from '../lib/entitlements.js';

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    failed++;
  }
}

console.log('--- Running Milestone v2.1 Wave 1: Centralized Plan Registry & Pure Entitlement Engine Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Plan Registry Structure & Integrity
// ==========================================

check('registry: free plan exists in registry', () => {
  assert.ok(PLANS[PLAN_IDS.FREE], 'Free plan must exist in PLANS');
  assert.equal(PLANS[PLAN_IDS.FREE].id, 'free');
  assert.equal(PLANS[PLAN_IDS.FREE].name, 'Free');
  assert.equal(isValidPlan('free'), true);
  assert.equal(isValidPlan('FREE'), true);
});

check('registry: pro plan exists in registry', () => {
  assert.ok(PLANS[PLAN_IDS.PRO], 'Pro plan must exist in PLANS');
  assert.equal(PLANS[PLAN_IDS.PRO].id, 'pro');
  assert.equal(PLANS[PLAN_IDS.PRO].name, 'Pro');
  assert.equal(isValidPlan('pro'), true);
  assert.equal(isValidPlan('PRO'), true);
});

check('registry: all expected feature keys exist centrally', () => {
  const expectedKeys = [
    'remove_branding',
    'extended_analytics',
    'custom_domain',
    'multiple_profiles',
    'advanced_seo',
  ];
  for (const k of expectedKeys) {
    assert.ok(Object.values(FEATURE_KEYS).includes(k), `FEATURE_KEYS must contain ${k}`);
    assert.equal(isValidFeature(k), true, `${k} must be recognized by isValidFeature`);
  }
  assert.equal(isValidFeature('unknown_key'), false);
  assert.equal(isValidFeature(''), false);
  assert.equal(isValidFeature(null), false);
});

check('registry: free premium capabilities are all false', () => {
  const freeFeatures = PLANS[PLAN_IDS.FREE].features;
  for (const val of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(freeFeatures[val], false, `Free feature ${val} must be false`);
  }
});

check('registry: pro premium capabilities are all true', () => {
  const proFeatures = PLANS[PLAN_IDS.PRO].features;
  for (const val of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(proFeatures[val], true, `Pro feature ${val} must be true`);
  }
});

check('registry: no pricing or provider IDs exist in plan definitions', () => {
  for (const [key, plan] of Object.entries(PLANS)) {
    assert.strictEqual(plan.price, undefined, `Plan ${key} must not define price`);
    assert.strictEqual(plan.currency, undefined, `Plan ${key} must not define currency`);
    assert.strictEqual(plan.razorpayId, undefined, `Plan ${key} must not define razorpayId`);
    assert.strictEqual(plan.stripePriceId, undefined, `Plan ${key} must not define stripePriceId`);
    assert.strictEqual(plan.checkoutUrl, undefined, `Plan ${key} must not define checkoutUrl`);
  }
});

// ==========================================
// 2. Missing and Invalid Subscription Handling
// ==========================================

check('missing-subscription: null input resolves to free', () => {
  assert.equal(getEffectivePlan(null), PLAN_IDS.FREE);
  const ent = resolveEntitlements(null);
  assert.equal(ent.plan, PLAN_IDS.FREE);
  assert.equal(ent.isPro, false);
  assert.equal(ent.features.remove_branding, false);
});

check('missing-subscription: undefined input resolves to free', () => {
  assert.equal(getEffectivePlan(undefined), PLAN_IDS.FREE);
  const ent = resolveEntitlements(undefined);
  assert.equal(ent.plan, PLAN_IDS.FREE);
  assert.equal(ent.isPro, false);
});

check('invalid-subscription: primitive and array types resolve to free', () => {
  assert.equal(getEffectivePlan('string'), PLAN_IDS.FREE);
  assert.equal(getEffectivePlan(123), PLAN_IDS.FREE);
  assert.equal(getEffectivePlan(true), PLAN_IDS.FREE);
  assert.equal(getEffectivePlan([]), PLAN_IDS.FREE);
});

check('invalid-subscription: unknown plan string fails closed to free', () => {
  assert.equal(getEffectivePlan({ plan: 'enterprise', status: 'active' }), PLAN_IDS.FREE);
  assert.equal(getEffectivePlan({ plan: 'super_admin', status: 'active' }), PLAN_IDS.FREE);
  assert.equal(getEffectivePlan({ plan: '', status: 'active' }), PLAN_IDS.FREE);
});

check('invalid-subscription: unknown status string fails closed to free', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'unknown_status' }), PLAN_IDS.FREE);
  assert.equal(getEffectivePlan({ plan: 'pro', status: '' }), PLAN_IDS.FREE);
  assert.equal(getEffectivePlan({ plan: 'pro' }), PLAN_IDS.FREE);
});

// ==========================================
// 3. Status Behavior
// ==========================================

check('status: free plan with active status resolves to free', () => {
  assert.equal(getEffectivePlan({ plan: 'free', status: 'active' }), PLAN_IDS.FREE);
});

check('status: pro plan with active status resolves to pro', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'active' }), PLAN_IDS.PRO);
  const ent = resolveEntitlements({ plan: 'pro', status: 'active' });
  assert.equal(ent.plan, PLAN_IDS.PRO);
  assert.equal(ent.isPro, true);
  assert.equal(ent.features.remove_branding, true);
  assert.equal(ent.features.extended_analytics, true);
  assert.equal(ent.features.custom_domain, true);
});

check('status: pro plan with trialing status resolves to pro', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'trialing' }), PLAN_IDS.PRO);
  assert.equal(hasFeature({ plan: 'pro', status: 'trialing' }, 'remove_branding'), true);
});

check('status: pro plan with past_due status fails closed to free', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'past_due' }), PLAN_IDS.FREE);
  assert.equal(hasFeature({ plan: 'pro', status: 'past_due' }, 'remove_branding'), false);
});

check('status: pro plan with canceled status fails closed to free', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'canceled' }), PLAN_IDS.FREE);
  assert.equal(hasFeature({ plan: 'pro', status: 'canceled' }, 'remove_branding'), false);
});

check('status: pro plan with incomplete status fails closed to free', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'incomplete' }), PLAN_IDS.FREE);
  assert.equal(hasFeature({ plan: 'pro', status: 'incomplete' }, 'remove_branding'), false);
});

check('status: pro plan with expired status fails closed to free', () => {
  assert.equal(getEffectivePlan({ plan: 'pro', status: 'expired' }), PLAN_IDS.FREE);
  assert.equal(hasFeature({ plan: 'pro', status: 'expired' }, 'remove_branding'), false);
});

// ==========================================
// 4. Period End Behavior (Deterministic Time)
// ==========================================

const testNow = new Date('2026-08-15T12:00:00.000Z');

check('period: pro active without currentPeriodEnd resolves to pro (e.g. manual grants)', () => {
  const sub = { plan: 'pro', status: 'active', provider: 'manual' };
  assert.equal(getEffectivePlan(sub, { now: testNow }), PLAN_IDS.PRO);
});

check('period: pro active with future currentPeriodEnd resolves to pro', () => {
  const futureDate = new Date('2026-09-15T12:00:00.000Z');
  const sub = { plan: 'pro', status: 'active', currentPeriodEnd: futureDate };
  assert.equal(getEffectivePlan(sub, { now: testNow }), PLAN_IDS.PRO);

  // ISO string format
  const subStr = { plan: 'pro', status: 'active', currentPeriodEnd: '2026-09-15T12:00:00.000Z' };
  assert.equal(getEffectivePlan(subStr, { now: testNow }), PLAN_IDS.PRO);
});

check('period: pro active with exact currentPeriodEnd === now fails closed to free', () => {
  const sub = { plan: 'pro', status: 'active', currentPeriodEnd: testNow };
  assert.equal(getEffectivePlan(sub, { now: testNow }), PLAN_IDS.FREE);
});

check('period: pro active with past currentPeriodEnd fails closed to free', () => {
  const pastDate = new Date('2026-08-14T12:00:00.000Z');
  const sub = { plan: 'pro', status: 'active', currentPeriodEnd: pastDate };
  assert.equal(getEffectivePlan(sub, { now: testNow }), PLAN_IDS.FREE);
});

check('period: explicit malformed currentPeriodEnd fails closed to free', () => {
  const sub1 = { plan: 'pro', status: 'active', currentPeriodEnd: 'not-a-date' };
  assert.equal(getEffectivePlan(sub1, { now: testNow }), PLAN_IDS.FREE);

  const sub2 = { plan: 'pro', status: 'active', currentPeriodEnd: new Date('invalid') };
  assert.equal(getEffectivePlan(sub2, { now: testNow }), PLAN_IDS.FREE);
});

// ==========================================
// 5. Feature Checks
// ==========================================

check('features: free remove_branding evaluates to false', () => {
  assert.equal(hasFeature(null, 'remove_branding'), false);
  assert.equal(hasFeature({ plan: 'free', status: 'active' }, 'remove_branding'), false);
});

check('features: pro remove_branding evaluates to true', () => {
  assert.equal(hasFeature({ plan: 'pro', status: 'active' }, 'remove_branding'), true);
});

check('features: free extended_analytics evaluates to false', () => {
  assert.equal(hasFeature({ plan: 'free', status: 'active' }, 'extended_analytics'), false);
});

check('features: pro custom_domain evaluates to true', () => {
  assert.equal(hasFeature({ plan: 'pro', status: 'active' }, 'custom_domain'), true);
});

check('features: unknown feature key returns false without throwing', () => {
  assert.equal(hasFeature({ plan: 'pro', status: 'active' }, 'unknown_feature'), false);
  assert.equal(hasFeature({ plan: 'pro', status: 'active' }, ''), false);
  assert.equal(hasFeature({ plan: 'pro', status: 'active' }, null), false);
});

// ==========================================
// 6. Safety, Purity, and Immutability
// ==========================================

check('safety: resolver does not mutate subscription input', () => {
  const originalSub = {
    plan: 'pro',
    status: 'active',
    currentPeriodEnd: '2026-09-15T12:00:00.000Z',
  };
  const copy = JSON.parse(JSON.stringify(originalSub));
  resolveEntitlements(originalSub, { now: testNow });
  assert.deepEqual(originalSub, copy, 'Subscription object must remain unmodified');
});

check('safety: registry cannot be mutated in normal use', () => {
  assert.throws(() => {
    PLANS.pro.features.remove_branding = false;
  }, /TypeError|Cannot assign to read only property/);

  assert.throws(() => {
    PLAN_IDS.PRO = 'custom';
  }, /TypeError|Cannot assign to read only property/);
});

check('safety: zero DB, network, or provider imports in lib/plans.js & lib/entitlements.js', () => {
  const plansSrc = fs.readFileSync(path.join(projectRoot, 'lib/plans.js'), 'utf-8');
  const entSrc = fs.readFileSync(path.join(projectRoot, 'lib/entitlements.js'), 'utf-8');

  const forbiddenTerms = [
    'mongoose',
    'mongodb',
    'next-auth',
    'headers',
    'stripe',
    'razorpay',
    'fetch',
    'process.env',
  ];

  for (const term of forbiddenTerms) {
    assert.ok(!plansSrc.includes(term), `lib/plans.js must not contain ${term}`);
    assert.ok(!entSrc.includes(term), `lib/entitlements.js must not contain ${term}`);
  }
});

check('safety: package.json has zero new npm dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.stripe, 'Must not include stripe');
  assert.ok(!allDeps.razorpay, 'Must not include razorpay');
});

check('safety: User and Page schemas unchanged in Wave 1', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');

  assert.ok(!userSrc.includes('isPro'), 'User model must not include isPro');
  assert.ok(!pageSrc.includes('subscription'), 'Page model must not include subscription');
});

check('safety: public profile branding rendering remains present in Wave 1', () => {
  const publicPageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(publicPageSrc.includes('Made with Linktree'), 'Public profile branding remains present in Wave 1');
});

check('safety: existing v2.0 features remain ungated in Wave 1', () => {
  const pageActionSrc = fs.readFileSync(path.join(projectRoot, 'action/PageAction.js'), 'utf-8');
  assert.ok(pageActionSrc.includes('sanitizeTipJarConfig'), 'Tip Jar configuration remains present');
  assert.ok(pageActionSrc.includes('fonts'), 'Fonts selection remains present');
});

console.log('\n================================');
console.log('Wave 1 Entitlement Engine Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
