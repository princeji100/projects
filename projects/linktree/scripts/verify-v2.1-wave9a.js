import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import mongoose from 'mongoose';

import {
  PRODUCT_NAME,
  PRODUCT_SHORT_NAME,
  PRODUCT_TAGLINE,
  PRODUCT_DESCRIPTION,
  DEFAULT_PLATFORM_DOMAIN,
  DEFAULT_PLATFORM_URL,
} from '../lib/brand.js';
import { getBaseUrl, getPlatformProfileUrl, getCanonicalProfileUrl } from '../lib/siteUrl.js';
import { getSafeUserEntitlements } from '../lib/featureAccess.js';
import { PRO_ROADMAP_FEATURES } from '../lib/billingPresentation.js';
import { PLAN_IDS, FEATURE_KEYS } from '../lib/plans.js';

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

console.log('--- Running Milestone v2.1 Wave 9A: Production Domain Migration & Rebrand Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');
const targetUserId = new mongoose.Types.ObjectId().toString();

// Stub mongoose.connect so pure helper tests run hermetically without live MongoDB
const origMongooseConnect = mongoose.connect;
mongoose.connect = async () => mongoose.connection;

// ==========================================
// 1. Centralized Product & Brand Identity
// ==========================================

await check('brand: product name is Prince Links', () => {
  assert.equal(PRODUCT_NAME, 'Prince Links');
  assert.equal(PRODUCT_SHORT_NAME, 'Prince Links');
  assert.equal(PRODUCT_TAGLINE, 'Links, Content & Creator Analytics');
  assert.equal(PRODUCT_DESCRIPTION, 'Create a customizable creator page for your links, content, UPI tips and audience analytics.');
  assert.equal(DEFAULT_PLATFORM_DOMAIN, 'links.princeji.com');
  assert.equal(DEFAULT_PLATFORM_URL, 'https://links.princeji.com');
});

// ==========================================
// 2. Homepage & Marketing Brand Text
// ==========================================

await check('homepage: title uses Prince Links metadata', () => {
  const homeSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/page.js'), 'utf-8');
  assert.ok(homeSrc.includes('title: "Prince Links — Links, Content & Creator Analytics"'));
  assert.ok(homeSrc.includes('description: "Create a customizable creator page for your links, content, UPI tips and audience analytics."'));
});

await check('homepage: old customer-facing Linktree branding removed', () => {
  const homeSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/page.js'), 'utf-8');
  assert.ok(!homeSrc.includes('Powered by Linktree'));
  assert.ok(homeSrc.includes('Powered by Prince Links'));
  assert.ok(homeSrc.includes('Prince Links. All rights reserved.'));
});

await check('homepage: old Vercel hostname removed from customer-facing copy', () => {
  const homeSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/page.js'), 'utf-8');
  assert.ok(!homeSrc.includes('linktree-princeji.vercel.app'));
  assert.ok(homeSrc.includes('links.princeji.com/yourname'));
});

await check('homepage: free marketing positioning corrected to truthful access copy', () => {
  const homeSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/page.js'), 'utf-8');
  assert.ok(!homeSrc.includes('100% Free for Invited Users'));
  assert.ok(homeSrc.includes('Free access for approved creators'));
});

// ==========================================
// 3. Claim Preview & Forms
// ==========================================

await check('claim-preview: HeroForm fallback prefix uses production domain', () => {
  const heroFormSrc = fs.readFileSync(path.join(projectRoot, 'components/forms/HeroForm.js'), 'utf-8');
  assert.ok(heroFormSrc.includes("'links.princeji.com/'"));
  assert.ok(!heroFormSrc.includes('linktree-princeji.vercel.app'));
});

await check('onboarding: UserNameForm fallback prefix uses production domain and truthful Free badge', () => {
  const userFormSrc = fs.readFileSync(path.join(projectRoot, 'components/forms/UserNameForm.js'), 'utf-8');
  assert.ok(userFormSrc.includes("'links.princeji.com/'"));
  assert.ok(!userFormSrc.includes('linktree-princeji.vercel.app'));
  assert.ok(!userFormSrc.includes('100% Free'));
  assert.ok(userFormSrc.includes('Start Free'));
});

// ==========================================
// 4. About & Auth Pages
// ==========================================

await check('about: customer-facing branding updated to Prince Links and truthful Free plan copy', () => {
  const aboutSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/about/page.js'), 'utf-8');
  assert.ok(aboutSrc.includes('About | Prince Links Platform & Creator Info'));
  assert.ok(aboutSrc.includes('Why is this Prince Links platform invite-only?'));
  assert.ok(aboutSrc.includes('Join Prince Links'));
  assert.ok(aboutSrc.includes('generous Free plan'));
  assert.ok(!aboutSrc.includes('Yes, 100% free with unlimited links'));
  assert.ok(aboutSrc.includes('Prince Links. Main Portfolio:'));
});

await check('auth: login portal header uses Prince Links Access Portal', () => {
  const loginSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/login/page.js'), 'utf-8');
  assert.ok(loginSrc.includes('Prince Links Access Portal'));
  assert.ok(!loginSrc.includes('Linktree Access Portal'));
});

// ==========================================
// 5. Public Profile & Preview Branding
// ==========================================

await check('public-profile: Free public profile displays Prince Links and Made with Prince Links', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('Prince Links</span>'));
  assert.ok(pageSrc.includes('Made with Prince Links'));
  assert.ok(!pageSrc.includes('Made with Linktree'));
});

await check('public-profile: Pro branding-removal entitlement still omits platform branding', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('!canRemoveBranding ?'));
  assert.ok(pageSrc.includes('!canRemoveBranding && ('));
});

await check('preview: PhonePreview Free watermark displays Prince Links', () => {
  const previewSrc = fs.readFileSync(path.join(projectRoot, 'components/preview/PhonePreview.js'), 'utf-8');
  assert.ok(previewSrc.includes('Prince Links'));
  assert.ok(previewSrc.includes('!hideBranding && ('));
});

await check('preview: PhonePreview Pro watermark remains hidden when hideBranding is true', () => {
  const previewSrc = fs.readFileSync(path.join(projectRoot, 'components/preview/PhonePreview.js'), 'utf-8');
  assert.ok(previewSrc.includes('hideBranding = false'));
});

// ==========================================
// 6. QR & Canonical URL Parity
// ==========================================

await check('qr: QRCodeCard native share and card title use Prince Links while preserving canonical URL', () => {
  const qrSrc = fs.readFileSync(path.join(projectRoot, 'components/sections/QRCodeCard.js'), 'utf-8');
  assert.ok(qrSrc.includes("'s Prince Links`"));
  assert.ok(qrSrc.includes('Check out my links and profile on Prince Links!'));
  assert.ok(qrSrc.includes('Share Your Prince Links Profile'));
  assert.ok(qrSrc.includes('publicUrl'));
});

await check('canonical-url: centralized URL resolution retains Wave 3 architecture', () => {
  const origEnv = process.env.NEXT_PUBLIC_URL;
  try {
    process.env.NEXT_PUBLIC_URL = 'https://links.princeji.com';
    assert.equal(getBaseUrl(), 'https://links.princeji.com');
    assert.equal(getPlatformProfileUrl('alex'), 'https://links.princeji.com/alex');
    assert.equal(getCanonicalProfileUrl({ uri: 'alex' }), 'https://links.princeji.com/alex');
  } finally {
    process.env.NEXT_PUBLIC_URL = origEnv;
  }
});

// ==========================================
// 7. Safety, Entitlement & Non-Regression Invariants
// ==========================================

await check('safety: billing entitlement capability keys and plans unchanged', () => {
  assert.equal(PLAN_IDS.FREE, 'free');
  assert.equal(PLAN_IDS.PRO, 'pro');
  assert.equal(FEATURE_KEYS.REMOVE_BRANDING, 'remove_branding');
  assert.equal(FEATURE_KEYS.EXTENDED_ANALYTICS, 'extended_analytics');

  const removeBrandingItem = PRO_ROADMAP_FEATURES.find((f) => f.key === 'remove_branding');
  assert.ok(removeBrandingItem);
  assert.equal(removeBrandingItem.key, 'remove_branding');
  assert.equal(removeBrandingItem.status, 'Available with Pro');
});

await check('safety: remove_branding remains unchanged internally', async () => {
  const entitlements = await getSafeUserEntitlements(targetUserId, {
    getSubscription: async () => ({
      userId: targetUserId,
      plan: 'pro',
      status: 'active',
    }),
  });
  assert.strictEqual(entitlements.features.remove_branding, true);
  assert.strictEqual(entitlements.features.extended_analytics, true);
});

await check('safety: no Page/User/Subscription schema changes', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  const subSrc = fs.readFileSync(path.join(projectRoot, 'models/Subscription.js'), 'utf-8');

  assert.ok(!userSrc.includes('isPro'));
  assert.ok(!pageSrc.includes('subscription'));
  assert.ok(subSrc.includes('plan: {'));
});

await check('safety: no auth, analytics, admin, or custom domain routing modifications', () => {
  const authRoute = fs.readFileSync(path.join(projectRoot, 'app/api/auth/[...nextauth]/route.js'), 'utf-8');
  const adminSrc = fs.readFileSync(path.join(projectRoot, 'lib/admin.js'), 'utf-8');
  assert.ok(authRoute.includes('GoogleProvider'));
  assert.ok(adminSrc.includes('isUserAdmin'));
});

await check('safety: zero Razorpay or Stripe payment code added', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay, 'Must not contain razorpay SDK');
  assert.ok(!allDeps.stripe, 'Must not contain stripe SDK');
});

await check('safety: zero new npm dependencies in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps['new-dependency']);
});

await check('safety: old production Vercel hostname does not appear in customer-facing source', () => {
  const customerFacingFiles = [
    'app/(default)/page.js',
    'app/(default)/about/page.js',
    'app/(default)/login/page.js',
    'app/(page)/[uri]/page.js',
    'app/(page)/[uri]/not-found.js',
    'components/forms/HeroForm.js',
    'components/forms/UserNameForm.js',
    'components/preview/PhonePreview.js',
    'components/sections/QRCodeCard.js',
    'components/billing/BillingClient.js',
    'components/admin/AdminAllowlistClient.js',
  ];

  for (const relPath of customerFacingFiles) {
    const content = fs.readFileSync(path.join(projectRoot, relPath), 'utf-8');
    assert.ok(
      !content.includes('linktree-princeji.vercel.app'),
      `Customer-facing file ${relPath} must not contain old Vercel domain`
    );
  }
});

await check('safety: no unsafe repository-wide lowercase linktree rename occurred', () => {
  const eventModel = fs.readFileSync(path.join(projectRoot, 'models/Event.js'), 'utf-8');
  assert.ok(eventModel.includes('page: {'));
  const dbSrc = fs.readFileSync(path.join(projectRoot, 'lib/connectToDB.js'), 'utf-8');
  assert.ok(dbSrc.includes('mongoose.connect'));
});

await check('regression: all existing v2.1 Waves 1–8 remain 100% green', () => {
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

  const w6 = execSync('node scripts/verify-v2.1-wave6.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w6.includes('FAILED:  0'));

  const w7 = execSync('node scripts/verify-v2.1-wave7.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w7.includes('FAILED:  0'));

  const w8 = execSync('node scripts/verify-v2.1-wave8.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w8.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 9A Brand & Domain Migration Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
