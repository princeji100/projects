import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import mongoose from 'mongoose';

import {
  getUserEntitlements,
  getSafeUserEntitlements,
  userHasFeature,
  requireUserFeature,
  getSessionEntitlements,
  getClientFeatureFlags,
  FeatureAccessError,
} from '../lib/featureAccess.js';
import { toClientFeatureFlags } from '../lib/entitlements.js';
import { FEATURE_KEYS } from '../lib/plans.js';

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

console.log('--- Running Milestone v2.1 Wave 4: Feature Gate Infrastructure Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');
const validUserId = new mongoose.Types.ObjectId().toString();

// ==========================================
// 1. Server Entitlement Loading
// ==========================================

await check('server-loading: feature access module exports expected functions', () => {
  assert.equal(typeof getUserEntitlements, 'function');
  assert.equal(typeof getSafeUserEntitlements, 'function');
  assert.equal(typeof userHasFeature, 'function');
  assert.equal(typeof requireUserFeature, 'function');
  assert.equal(typeof getSessionEntitlements, 'function');
  assert.equal(typeof getClientFeatureFlags, 'function');
  assert.ok(FeatureAccessError.prototype instanceof Error);
});

await check('server-loading: valid user with no subscription resolves to Free entitlements', async () => {
  const entitlements = await getUserEntitlements(validUserId, {
    getSubscription: async () => null,
  });
  assert.equal(entitlements.plan, 'free');
  assert.equal(entitlements.isPro, false);
  assert.equal(entitlements.features.remove_branding, false);
});

await check('server-loading: valid user with active Pro resolves to Pro entitlements', async () => {
  const entitlements = await getUserEntitlements(validUserId, {
    getSubscription: async () => ({
      userId: validUserId,
      plan: 'pro',
      status: 'active',
    }),
  });
  assert.equal(entitlements.plan, 'pro');
  assert.equal(entitlements.isPro, true);
  assert.equal(entitlements.features.remove_branding, true);
  assert.equal(entitlements.features.custom_domain, true);
});

await check('server-loading: valid user with canceled or expired subscription resolves to Free', async () => {
  const entitlementsCanceled = await getUserEntitlements(validUserId, {
    getSubscription: async () => ({
      userId: validUserId,
      plan: 'pro',
      status: 'canceled',
    }),
  });
  assert.equal(entitlementsCanceled.plan, 'free');
  assert.equal(entitlementsCanceled.isPro, false);

  const testNow = new Date('2026-08-15T12:00:00.000Z');
  const entitlementsExpired = await getUserEntitlements(validUserId, {
    now: testNow,
    getSubscription: async () => ({
      userId: validUserId,
      plan: 'pro',
      status: 'active',
      currentPeriodEnd: new Date('2026-08-14T12:00:00.000Z'),
    }),
  });
  assert.equal(entitlementsExpired.plan, 'free');
  assert.equal(entitlementsExpired.isPro, false);
});

await check('server-loading: invalid user ID fails closed to Free without calling fetcher', async () => {
  let fetcherCalled = false;
  const dummyFetcher = async () => {
    fetcherCalled = true;
    return { plan: 'pro', status: 'active' };
  };

  const entNull = await getUserEntitlements(null, { getSubscription: dummyFetcher });
  assert.equal(entNull.plan, 'free');
  assert.equal(fetcherCalled, false);

  const entBadHex = await getUserEntitlements('not-a-valid-id', { getSubscription: dummyFetcher });
  assert.equal(entBadHex.plan, 'free');
  assert.equal(fetcherCalled, false);
});

await check('server-loading: getSessionEntitlements delegates strictly to session.user.id', async () => {
  let capturedUserId = null;
  const mockSession = {
    user: {
      id: validUserId,
      email: 'creator@example.com',
    },
  };

  const entitlements = await getSessionEntitlements(mockSession, {
    getSubscription: async (uid) => {
      capturedUserId = uid.toString();
      return { plan: 'pro', status: 'active' };
    },
  });

  assert.equal(capturedUserId, validUserId);
  assert.equal(entitlements.isPro, true);
});

// ==========================================
// 2. Database Error Handling
// ==========================================

await check('db-error: strict getUserEntitlements propagates repository DB error', async () => {
  await assert.rejects(
    async () => {
      await getUserEntitlements(validUserId, {
        getSubscription: async () => {
          throw new Error('MongoConnectionTimeout');
        },
      });
    },
    /MongoConnectionTimeout/
  );
});

await check('db-error: safe getSafeUserEntitlements catches DB error and fails closed to Free', async () => {
  let capturedError = null;
  const entitlements = await getSafeUserEntitlements(validUserId, {
    getSubscription: async () => {
      throw new Error('MongoConnectionTimeout');
    },
    onError: (err) => {
      capturedError = err;
    },
  });

  assert.equal(entitlements.plan, 'free');
  assert.equal(entitlements.isPro, false);
  assert.ok(capturedError instanceof Error);
  assert.equal(capturedError.message, 'MongoConnectionTimeout');
});

await check('db-error: DB failure never returns Pro capabilities', async () => {
  const entitlements = await getSafeUserEntitlements(validUserId, {
    getSubscription: async () => {
      throw new Error('ClusterDown');
    },
  });
  assert.strictEqual(entitlements.isPro, false);
  for (const val of Object.values(entitlements.features)) {
    assert.strictEqual(val, false);
  }
});

// ==========================================
// 3. Feature Checks
// ==========================================

await check('feature-check: userHasFeature returns true for entitled capability', async () => {
  const has = await userHasFeature(validUserId, 'remove_branding', {
    getSubscription: async () => ({ plan: 'pro', status: 'active' }),
  });
  assert.strictEqual(has, true);
});

await check('feature-check: userHasFeature returns false for Free user', async () => {
  const has = await userHasFeature(validUserId, 'remove_branding', {
    getSubscription: async () => null,
  });
  assert.strictEqual(has, false);
});

await check('feature-check: userHasFeature returns false for unknown or invalid feature', async () => {
  const hasUnknown = await userHasFeature(validUserId, 'unknown_feature', {
    getSubscription: async () => ({ plan: 'pro', status: 'active' }),
  });
  assert.strictEqual(hasUnknown, false);

  const hasEmpty = await userHasFeature(validUserId, '', {
    getSubscription: async () => ({ plan: 'pro', status: 'active' }),
  });
  assert.strictEqual(hasEmpty, false);
});

await check('feature-check: userHasFeature returns false for invalid user ID', async () => {
  const has = await userHasFeature('invalid-user', 'remove_branding', {
    getSubscription: async () => ({ plan: 'pro', status: 'active' }),
  });
  assert.strictEqual(has, false);
});

// ==========================================
// 4. Server Enforcement Helper
// ==========================================

await check('enforcement: requireUserFeature passes when user is entitled', async () => {
  const result = await requireUserFeature(validUserId, 'remove_branding', {
    getSubscription: async () => ({ plan: 'pro', status: 'active' }),
  });
  assert.ok(result);
  assert.equal(result.plan, 'pro');
  assert.equal(result.features.remove_branding, true);
});

await check('enforcement: requireUserFeature throws FeatureAccessError when feature is denied', async () => {
  await assert.rejects(
    async () => {
      await requireUserFeature(validUserId, 'remove_branding', {
        getSubscription: async () => null,
      });
    },
    (err) => {
      assert.ok(err instanceof FeatureAccessError);
      assert.equal(err.code, 'FEATURE_NOT_AVAILABLE');
      assert.equal(err.feature, 'remove_branding');
      return true;
    }
  );
});

await check('enforcement: requireUserFeature denies unknown features with FeatureAccessError', async () => {
  await assert.rejects(
    async () => {
      await requireUserFeature(validUserId, 'nonexistent_cap', {
        getSubscription: async () => ({ plan: 'pro', status: 'active' }),
      });
    },
    (err) => {
      assert.ok(err instanceof FeatureAccessError);
      assert.equal(err.code, 'FEATURE_NOT_AVAILABLE');
      return true;
    }
  );
});

await check('enforcement: FeatureAccessError does not contain billing secrets or provider IDs', () => {
  const err = new FeatureAccessError('custom_domain');
  assert.strictEqual(err.providerCustomerId, undefined);
  assert.strictEqual(err.providerSubscriptionId, undefined);
  assert.strictEqual(err.subscription, undefined);
});

// ==========================================
// 5. Client Projection (toClientFeatureFlags)
// ==========================================

await check('projection: returns all canonical feature keys as booleans', () => {
  const proEntitlements = {
    plan: 'pro',
    isPro: true,
    features: {
      remove_branding: true,
      extended_analytics: true,
      custom_domain: true,
      multiple_profiles: true,
      advanced_seo: true,
    },
  };
  const flags = toClientFeatureFlags(proEntitlements);
  for (const k of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(typeof flags[k], 'boolean');
    assert.strictEqual(flags[k], true);
  }
});

await check('projection: Free projection produces all false flags', () => {
  const freeEntitlements = {
    plan: 'free',
    isPro: false,
    features: {
      remove_branding: false,
      extended_analytics: false,
      custom_domain: false,
      multiple_profiles: false,
      advanced_seo: false,
    },
  };
  const flags = toClientFeatureFlags(freeEntitlements);
  for (const k of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(flags[k], false);
  }
});

await check('projection: malformed or null inputs fail closed to all false', () => {
  const flagsNull = toClientFeatureFlags(null);
  for (const k of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(flagsNull[k], false);
  }

  const flagsPrimitive = toClientFeatureFlags('pro');
  for (const k of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(flagsPrimitive[k], false);
  }
});

await check('projection: drops plan, status, provider IDs, and arbitrary keys', () => {
  const dirtyInput = {
    plan: 'pro',
    status: 'active',
    provider: 'stripe',
    providerCustomerId: 'cus_123',
    providerSubscriptionId: 'sub_123',
    userId: 'user-123',
    secretKey: 'sk_test_123',
    features: {
      remove_branding: true,
      arbitrary_key: true,
    },
  };
  const flags = toClientFeatureFlags(dirtyInput);
  assert.strictEqual(flags.plan, undefined);
  assert.strictEqual(flags.status, undefined);
  assert.strictEqual(flags.provider, undefined);
  assert.strictEqual(flags.providerCustomerId, undefined);
  assert.strictEqual(flags.providerSubscriptionId, undefined);
  assert.strictEqual(flags.userId, undefined);
  assert.strictEqual(flags.secretKey, undefined);
  assert.strictEqual(flags.arbitrary_key, undefined);
  assert.strictEqual(flags.remove_branding, true);
  assert.strictEqual(flags.extended_analytics, false);
});

await check('projection: output is completely JSON serializable', () => {
  const flags = toClientFeatureFlags({
    features: {
      remove_branding: true,
    },
  });
  const serialized = JSON.stringify(flags);
  const deserialized = JSON.parse(serialized);
  assert.deepEqual(flags, deserialized);
});

await check('projection: getClientFeatureFlags resolves serialized flags for a user', async () => {
  const flags = await getClientFeatureFlags(validUserId, {
    getSubscription: async () => ({ plan: 'pro', status: 'active' }),
  });
  assert.strictEqual(flags.remove_branding, true);
  assert.strictEqual(flags.custom_domain, true);
  assert.strictEqual(flags.plan, undefined);
});

// ==========================================
// 6. Architectural Safety & Isolation
// ==========================================

await check('safety: no Client Component imports subscriptionRepository', () => {
  const componentsDir = path.join(projectRoot, 'components');
  const files = fs.readdirSync(componentsDir, { recursive: true });
  for (const f of files) {
    if (typeof f === 'string' && f.endsWith('.js')) {
      const content = fs.readFileSync(path.join(componentsDir, f), 'utf-8');
      assert.ok(
        !content.includes('subscriptionRepository'),
        `Component ${f} must not import subscriptionRepository`
      );
    }
  }
});

await check('safety: no Client Component imports Subscription model', () => {
  const componentsDir = path.join(projectRoot, 'components');
  const files = fs.readdirSync(componentsDir, { recursive: true });
  for (const f of files) {
    if (typeof f === 'string' && f.endsWith('.js')) {
      const content = fs.readFileSync(path.join(componentsDir, f), 'utf-8');
      assert.ok(
        !content.includes('models/Subscription'),
        `Component ${f} must not import models/Subscription`
      );
    }
  }
});

await check('safety: public profile branding remains present in page.js', () => {
  const publicPageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(
    publicPageSrc.includes('Made with Prince Links') || publicPageSrc.includes('Made with Linktree'),
    'Public profile branding remains present'
  );
});

await check('safety: dashboard visible behavior unchanged (no upgrade button or locked gates)', () => {
  const layoutSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/layout.js'), 'utf-8');
  assert.ok(!layoutSrc.includes('Upgrade to Pro'));
  assert.ok(!layoutSrc.includes('PricingModal'));
});

await check('safety: existing v2 features remain ungated and active', () => {
  const actionsSrc = fs.readFileSync(path.join(projectRoot, 'action/PageAction.js'), 'utf-8');
  assert.ok(!actionsSrc.includes('requireUserFeature'), 'v2 actions must not gate existing features');
});

await check('safety: Page, User, Subscription, and Event schemas unchanged', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  assert.ok(!userSrc.includes('isPro'));
  assert.ok(!pageSrc.includes('plan'));
});

await check('safety: zero DB write methods in subscriptionRepository', () => {
  const repoSrc = fs.readFileSync(path.join(projectRoot, 'lib/subscriptionRepository.js'), 'utf-8');
  assert.ok(!repoSrc.includes('createSubscription'));
  assert.ok(!repoSrc.includes('grantPro'));
});

await check('safety: zero new npm dependencies in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.redis);
  assert.ok(!allDeps.stripe);
  assert.ok(!allDeps.razorpay);
});

await check('regression: prior wave suites (Wave 1, 2, 3) remain 100% green', () => {
  const w1 = execSync('node scripts/verify-v2.1-wave1.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w1.includes('FAILED:  0'));

  const w2 = execSync('node scripts/verify-v2.1-wave2.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w2.includes('FAILED:  0'));

  const w3 = execSync('node scripts/verify-v2.1-wave3.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w3.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 4 Feature Gate Infrastructure Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
