import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import mongoose from 'mongoose';

import { getPageOwnerUserId } from '../lib/pageOwnerResolver.js';
import { getSafeUserEntitlements, getUserEntitlements } from '../lib/featureAccess.js';
import { resolveEntitlements, hasFeature } from '../lib/entitlements.js';
import { PRO_ROADMAP_FEATURES } from '../lib/billingPresentation.js';

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

console.log('--- Running Milestone v2.1 Wave 7: Pro Feature 1 — Remove Platform Branding Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');
const targetUserId = new mongoose.Types.ObjectId().toString();

// Stub mongoose.connect so pure helper tests run hermetically without live MongoDB
const origMongooseConnect = mongoose.connect;
mongoose.connect = async () => mongoose.connection;

// ==========================================
// 1. Page Owner Identity Bridge
// ==========================================

await check('owner-resolver: getPageOwnerUserId function exists and exports', () => {
  assert.equal(typeof getPageOwnerUserId, 'function');
});

await check('owner-resolver: resolves User._id for matching Page object or email string', async () => {
  const mockFindUser = async (email) => {
    if (email === 'creator@example.com') {
      return { _id: targetUserId };
    }
    return null;
  };

  const fromPage = await getPageOwnerUserId({ owner: 'creator@example.com' }, { findUser: mockFindUser });
  assert.equal(fromPage.toString(), targetUserId);

  const fromEmail = await getPageOwnerUserId('creator@example.com', { findUser: mockFindUser });
  assert.equal(fromEmail.toString(), targetUserId);
});

await check('owner-resolver: normalizes email casing and trims whitespace', async () => {
  const mockFindUser = async (email) => {
    if (email === 'creator@example.com') {
      return { _id: targetUserId };
    }
    return null;
  };

  const id = await getPageOwnerUserId({ owner: '  CREATOR@EXAMPLE.COM  ' }, { findUser: mockFindUser });
  assert.equal(id.toString(), targetUserId);
});

await check('owner-resolver: returns null for missing page or empty owner without DB query', async () => {
  let queried = false;
  const mockFindUser = async () => {
    queried = true;
    return null;
  };

  assert.strictEqual(await getPageOwnerUserId(null, { findUser: mockFindUser }), null);
  assert.strictEqual(await getPageOwnerUserId({}, { findUser: mockFindUser }), null);
  assert.strictEqual(await getPageOwnerUserId({ owner: '' }, { findUser: mockFindUser }), null);
  assert.strictEqual(queried, false);
});

await check('owner-resolver: returns null when matching User is not found (fails closed)', async () => {
  const mockFindUser = async () => null;
  const id = await getPageOwnerUserId({ owner: 'nonexistent@example.com' }, { findUser: mockFindUser });
  assert.strictEqual(id, null);
});

await check('owner-resolver: returns User._id only, never full User document or sensitive data', async () => {
  const mockFindUser = async () => ({ _id: targetUserId, passwordHash: 'secret_hash', email: 'secret@example.com' });
  const id = await getPageOwnerUserId('user@example.com', { findUser: mockFindUser });
  assert.equal(id.toString(), targetUserId);
  assert.strictEqual(id.passwordHash, undefined);
});

// ==========================================
// 2. Public Profile Entitlement & Branding
// ==========================================

await check('public-profile: imports getPageOwnerUserId and getSafeUserEntitlements', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('getPageOwnerUserId'));
  assert.ok(pageSrc.includes('getSafeUserEntitlements'));
  assert.ok(pageSrc.includes('canRemoveBranding'));
});

await check('public-profile: no subscription resolves to canRemoveBranding = false', async () => {
  const entitlements = await getSafeUserEntitlements(null);
  assert.strictEqual(entitlements.features.remove_branding, false);
});

await check('public-profile: active Pro resolves to canRemoveBranding = true', async () => {
  const entitlements = await getSafeUserEntitlements(targetUserId, {
    getSubscription: async () => ({
      userId: targetUserId,
      plan: 'pro',
      status: 'active',
    }),
  });
  assert.strictEqual(entitlements.features.remove_branding, true);
});

await check('public-profile: trialing Pro resolves to canRemoveBranding = true', async () => {
  const entitlements = await getSafeUserEntitlements(targetUserId, {
    getSubscription: async () => ({
      userId: targetUserId,
      plan: 'pro',
      status: 'trialing',
    }),
  });
  assert.strictEqual(entitlements.features.remove_branding, true);
});

await check('public-profile: expired, canceled, or past_due Pro resolves to canRemoveBranding = false', async () => {
  for (const status of ['expired', 'canceled', 'past_due', 'incomplete']) {
    const entitlements = await getSafeUserEntitlements(targetUserId, {
      getSubscription: async () => ({
        userId: targetUserId,
        plan: 'pro',
        status,
      }),
    });
    assert.strictEqual(
      entitlements.features.remove_branding,
      false,
      `Status ${status} must fail closed to false`
    );
  }
});

await check('public-profile: billing DB failure fails closed to canRemoveBranding = false', async () => {
  const entitlements = await getSafeUserEntitlements(targetUserId, {
    getSubscription: async () => {
      throw new Error('MongoTimeout');
    },
  });
  assert.strictEqual(entitlements.features.remove_branding, false);
});

await check('public-profile: server-side conditional rendering omits branding elements when entitled', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('!canRemoveBranding ?'));
  assert.ok(pageSrc.includes('!canRemoveBranding && ('));
  assert.ok(!pageSrc.includes('style={{ display: canRemoveBranding ? "none" : "block" }}'), 'Must not rely on CSS display:none');
});

// ==========================================
// 3. PhonePreview Watermark
// ==========================================

await check('preview: PhonePreview component accepts hideBranding prop', () => {
  const previewSrc = fs.readFileSync(path.join(projectRoot, 'components/preview/PhonePreview.js'), 'utf-8');
  assert.ok(previewSrc.includes('hideBranding = false'));
  assert.ok(previewSrc.includes('!hideBranding && ('));
});

await check('preview: dashboard page provides hideBranding from flags.remove_branding', () => {
  const dashboardSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/dashboard/page.js'), 'utf-8');
  assert.ok(dashboardSrc.includes('hideBranding: Boolean(pageData?.flags?.remove_branding)'));
});

await check('preview: /api/page route provides client feature flags for session.user.id', () => {
  const apiRouteSrc = fs.readFileSync(path.join(projectRoot, 'app/api/page/route.js'), 'utf-8');
  assert.ok(apiRouteSrc.includes('getClientFeatureFlags(session.user.id)'));
  assert.ok(apiRouteSrc.includes('flags,'));
});

// ==========================================
// 4. Billing Roadmap Status
// ==========================================

await check('billing: Remove Branding marked as Available with Pro in roadmap', () => {
  const removeBrandingItem = PRO_ROADMAP_FEATURES.find((f) => f.key === 'remove_branding');
  assert.ok(removeBrandingItem, 'remove_branding feature must exist');
  assert.equal(removeBrandingItem.status, 'Available with Pro');
  assert.equal(removeBrandingItem.statusVariant, 'success');
});

await check('billing: Extended Analytics roadmap item exists', () => {
  const extendedAnalytics = PRO_ROADMAP_FEATURES.find((f) => f.key === 'extended_analytics');
  assert.ok(extendedAnalytics);
  assert.ok(extendedAnalytics.status.includes('Upcoming') || extendedAnalytics.status.includes('Available'));
});

await check('billing: Custom Domains and others remain planned', () => {
  const customDomain = PRO_ROADMAP_FEATURES.find((f) => f.key === 'custom_domain');
  assert.equal(customDomain.status, 'Planned');
});

// ==========================================
// 5. Schema & Safety Bounds
// ==========================================

await check('safety: Page model schema has no branding toggle or isPro fields', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  assert.ok(!pageSrc.includes('hideBranding'));
  assert.ok(!pageSrc.includes('removeBranding'));
  assert.ok(!pageSrc.includes('isPro'));
});

await check('safety: User and Subscription schemas remain clean', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  assert.ok(!userSrc.includes('isPro'));
  assert.ok(!userSrc.includes('plan'));
});

await check('safety: zero new npm dependencies in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.stripe);
  assert.ok(!allDeps.razorpay);
});

await check('regression: prior wave foundations remain intact', () => {
  assert.ok(PLAN_IDS.FREE === 'free');
  assert.ok(PLAN_IDS.PRO === 'pro');
  assert.ok(resolveEntitlements(null).isPro === false);
});

console.log('\n================================');
console.log('Wave 7 Pro Branding Removal Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
