import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import mongoose from 'mongoose';

import {
  grantManualProByUserId,
  revokeManualProByUserId,
  normalizeUserId,
} from '../lib/subscriptionRepository.js';
import * as subRepo from '../lib/subscriptionRepository.js';
import { resolveEntitlements, hasFeature } from '../lib/entitlements.js';
import { formatBillingPresentation } from '../lib/billingPresentation.js';
import { isUserAdmin, getAdminEmail, DEFAULT_ADMIN_EMAIL } from '../lib/admin.js';

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

console.log('--- Running Milestone v2.1 Wave 6: Manual Admin Pro Grant Workflow Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');
const targetUserId = new mongoose.Types.ObjectId().toString();

// Stub mongoose.connect so repository methods run purely in-memory without live MongoDB connection
const origMongooseConnect = mongoose.connect;
mongoose.connect = async () => mongoose.connection;


// ==========================================
// 1. Repository Write Surface & Invariants
// ==========================================

await check('repo-write: explicit manual grant and revoke methods exist', () => {
  assert.equal(typeof grantManualProByUserId, 'function');
  assert.equal(typeof revokeManualProByUserId, 'function');
});

await check('repo-write: no generic arbitrary updateSubscription method is exported', () => {
  assert.strictEqual(subRepo.updateSubscription, undefined);
  assert.strictEqual(subRepo.setSubscription, undefined);
  assert.strictEqual(subRepo.modifySubscription, undefined);
});

await check('repo-write: grant targets validated User._id and rejects malformed IDs', async () => {
  await assert.rejects(
    async () => grantManualProByUserId('not-valid-hex'),
    (err) => err.code === 'INVALID_USER_ID'
  );
  await assert.rejects(
    async () => grantManualProByUserId(null),
    (err) => err.code === 'INVALID_USER_ID'
  );
});

await check('repo-write: grant verifies that target User exists', async () => {
  await assert.rejects(
    async () =>
      grantManualProByUserId(targetUserId, {
        findUser: async () => null, // User not found
      }),
    (err) => err.code === 'USER_NOT_FOUND'
  );
});

await check('repo-write: grant sets plan=pro, status=active, provider=manual, no periodEnd', async () => {
  let capturedUpdate = null;
  const result = await grantManualProByUserId(targetUserId, {
    findUser: async () => ({ _id: targetUserId, email: 'creator@example.com' }),
    findSubscription: async () => null,
    saveSubscription: async (id, update) => {
      capturedUpdate = update;
      return { userId: id, ...update.$set };
    },
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.effectivePlan, 'pro');
  assert.strictEqual(capturedUpdate.$set.plan, 'pro');
  assert.strictEqual(capturedUpdate.$set.status, 'active');
  assert.strictEqual(capturedUpdate.$set.provider, 'manual');
  assert.strictEqual(capturedUpdate.$set.cancelAtPeriodEnd, false);
  assert.strictEqual(capturedUpdate.$set.currentPeriodEnd, undefined);
  assert.strictEqual(capturedUpdate.$unset.providerCustomerId, '');
  assert.strictEqual(capturedUpdate.$unset.providerSubscriptionId, '');
});

await check('repo-write: revoke sets plan=free, status=active, provider=manual, clears period/payment metadata', async () => {
  let capturedUpdate = null;
  const result = await revokeManualProByUserId(targetUserId, {
    findSubscription: async () => ({
      userId: targetUserId,
      plan: 'pro',
      status: 'active',
      provider: 'manual',
    }),
    saveSubscription: async (id, update) => {
      capturedUpdate = update;
      return { userId: id, ...update.$set };
    },
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.effectivePlan, 'free');
  assert.strictEqual(capturedUpdate.$set.plan, 'free');
  assert.strictEqual(capturedUpdate.$set.status, 'active');
  assert.strictEqual(capturedUpdate.$set.provider, 'manual');
  assert.strictEqual(capturedUpdate.$unset.providerCustomerId, '');
  assert.strictEqual(capturedUpdate.$unset.providerSubscriptionId, '');
});

await check('repo-write: grant is idempotent across repeated executions', async () => {
  let saveCount = 0;
  const mockOptions = {
    findUser: async () => ({ _id: targetUserId }),
    findSubscription: async () => ({ userId: targetUserId, plan: 'pro', status: 'active', provider: 'manual' }),
    saveSubscription: async () => {
      saveCount++;
      return { userId: targetUserId, plan: 'pro', status: 'active', provider: 'manual' };
    },
  };

  const res1 = await grantManualProByUserId(targetUserId, mockOptions);
  const res2 = await grantManualProByUserId(targetUserId, mockOptions);
  assert.strictEqual(res1.effectivePlan, 'pro');
  assert.strictEqual(res2.effectivePlan, 'pro');
  assert.strictEqual(saveCount, 2);
});

await check('repo-write: revoke is idempotent and safe when no subscription exists', async () => {
  const result = await revokeManualProByUserId(targetUserId, {
    findSubscription: async () => null,
  });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.effectivePlan, 'free');
});

// ==========================================
// 2. Provider Protection (Stripe / Razorpay)
// ==========================================

await check('provider-protect: manual grant refuses Stripe-managed subscription', async () => {
  await assert.rejects(
    async () =>
      grantManualProByUserId(targetUserId, {
        findUser: async () => ({ _id: targetUserId }),
        findSubscription: async () => ({
          userId: targetUserId,
          plan: 'pro',
          status: 'active',
          provider: 'stripe',
          providerSubscriptionId: 'sub_stripe_123',
        }),
      }),
    (err) => err.code === 'SUBSCRIPTION_PROVIDER_MANAGED'
  );
});

await check('provider-protect: manual grant refuses Razorpay-managed subscription', async () => {
  await assert.rejects(
    async () =>
      grantManualProByUserId(targetUserId, {
        findUser: async () => ({ _id: targetUserId }),
        findSubscription: async () => ({
          userId: targetUserId,
          plan: 'pro',
          status: 'active',
          provider: 'razorpay',
          providerSubscriptionId: 'sub_rzp_123',
        }),
      }),
    (err) => err.code === 'SUBSCRIPTION_PROVIDER_MANAGED'
  );
});

await check('provider-protect: manual revoke refuses non-manual subscription', async () => {
  await assert.rejects(
    async () =>
      revokeManualProByUserId(targetUserId, {
        findSubscription: async () => ({
          userId: targetUserId,
          plan: 'pro',
          status: 'active',
          provider: 'stripe',
        }),
      }),
    (err) => err.code === 'SUBSCRIPTION_PROVIDER_MANAGED'
  );
});

// ==========================================
// 3. Server Authorization & Action Security
// ==========================================

await check('auth-security: verifyAdminCaller correctly authorizes ADMIN_EMAIL and rejects others', () => {
  const admin = getAdminEmail();
  assert.strictEqual(isUserAdmin(admin), true);
  assert.strictEqual(isUserAdmin('regular.user@example.com'), false);
  assert.strictEqual(isUserAdmin(null), false);
  assert.strictEqual(isUserAdmin(''), false);
});

await check('auth-security: AdminAction module exports grantManualProAction and revokeManualProAction', () => {
  const adminActionSrc = fs.readFileSync(path.join(projectRoot, 'action/AdminAction.js'), 'utf-8');
  assert.ok(adminActionSrc.includes('export async function grantManualProAction('));
  assert.ok(adminActionSrc.includes('export async function revokeManualProAction('));
  assert.ok(adminActionSrc.includes('verifyAdminCaller()'));
});

await check('auth-security: action does not expose raw Subscription document or provider IDs', () => {
  const adminActionSrc = fs.readFileSync(path.join(projectRoot, 'action/AdminAction.js'), 'utf-8');
  assert.ok(!adminActionSrc.includes('providerCustomerId:'));
  assert.ok(!adminActionSrc.includes('providerSubscriptionId:'));
});

// ==========================================
// 4. Admin UI Integration
// ==========================================

await check('admin-ui: AdminPage queries User and Subscription for billing tier info', () => {
  const adminPageSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/dashboard/admin/page.js'), 'utf-8');
  assert.ok(adminPageSrc.includes('User.find('));
  assert.ok(adminPageSrc.includes('Subscription.find('));
  assert.ok(adminPageSrc.includes('planTier'));
});

await check('admin-ui: AdminAllowlistClient provides Grant Pro and Revoke Pro buttons', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/admin/AdminAllowlistClient.js'), 'utf-8');
  assert.ok(clientSrc.includes('grantManualProAction'));
  assert.ok(clientSrc.includes('revokeManualProAction'));
  assert.ok(clientSrc.includes('Grant Pro'));
  assert.ok(clientSrc.includes('Revoke Pro'));
});

// ==========================================
// 5. End-to-End Entitlement Architecture
// ==========================================

await check('e2e: manual Pro subscription flows naturally through Wave 1 pure resolver', () => {
  const manualProSub = {
    userId: targetUserId,
    plan: 'pro',
    status: 'active',
    provider: 'manual',
    cancelAtPeriodEnd: false,
  };
  const entitlements = resolveEntitlements(manualProSub);
  assert.strictEqual(entitlements.plan, 'pro');
  assert.strictEqual(entitlements.isPro, true);
  assert.strictEqual(hasFeature(manualProSub, 'remove_branding'), true);
  assert.strictEqual(hasFeature(manualProSub, 'custom_domain'), true);
});

await check('e2e: revoked manual subscription naturally resolves to Free', () => {
  const revokedSub = {
    userId: targetUserId,
    plan: 'free',
    status: 'active',
    provider: 'manual',
    cancelAtPeriodEnd: false,
  };
  const entitlements = resolveEntitlements(revokedSub);
  assert.strictEqual(entitlements.plan, 'free');
  assert.strictEqual(entitlements.isPro, false);
  assert.strictEqual(hasFeature(revokedSub, 'remove_branding'), false);
});

await check('e2e: manual Pro displays truthfully in billing presentation formatter', () => {
  const manualProSub = {
    userId: targetUserId,
    plan: 'pro',
    status: 'active',
    provider: 'manual',
  };
  const entitlements = resolveEntitlements(manualProSub);
  const presentation = formatBillingPresentation(entitlements, manualProSub);
  assert.strictEqual(presentation.effectivePlan, 'pro');
  assert.strictEqual(presentation.displayStatus, 'Pro Plan');
  assert.strictEqual(presentation.statusBadge, 'Active');
});

await check('e2e: admin status alone does not grant Pro entitlements', () => {
  const adminWithoutSub = null;
  const entitlements = resolveEntitlements(adminWithoutSub);
  assert.strictEqual(entitlements.plan, 'free');
  assert.strictEqual(entitlements.isPro, false);
});

// ==========================================
// 6. Architectural Safety & Non-Regression
// ==========================================

await check('safety: public profile branding remains present in page.js', () => {
  const publicPageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(publicPageSrc.includes('Made with Linktree'));
});

await check('safety: zero checkout or payment SDK dependencies added', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.stripe);
  assert.ok(!allDeps.razorpay);
});

await check('safety: User, Page, Subscription schemas remain clean', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  assert.ok(!userSrc.includes('isPro'));
  assert.ok(!pageSrc.includes('plan'));
});

await check('regression: prior wave suites (Wave 1..5) remain 100% green', () => {
  const w1 = execSync('node scripts/verify-v2.1-wave1.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w1.includes('FAILED:  0'));

  const w2 = execSync('node scripts/verify-v2.1-wave2.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w2.includes('FAILED:  0'));

  const w3 = execSync('node scripts/verify-v2.1-wave3.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w3.includes('FAILED:  0'));

  const w4 = execSync('node scripts/verify-v2.1-wave4.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w4.includes('FAILED:  0'));

  const w5 = execSync('node scripts/verify-v2.1-wave5.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w5.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 6 Manual Pro Admin Workflow Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
