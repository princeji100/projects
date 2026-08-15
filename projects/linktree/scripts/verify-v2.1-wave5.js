import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { getNavItems } from '../lib/navConfig.js';
import {
  formatBillingPresentation,
  FREE_BASELINE_FEATURES,
  PRO_ROADMAP_FEATURES,
} from '../lib/billingPresentation.js';
import { resolveEntitlements } from '../lib/entitlements.js';
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

console.log('--- Running Milestone v2.1 Wave 5: Pricing, Upgrade & Current Plan UI Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Route & Navigation Architecture
// ==========================================

await check('nav: Billing route page exists and is an authenticated Server Component', () => {
  const billingPagePath = path.join(projectRoot, 'app/(app)/dashboard/billing/page.js');
  assert.ok(fs.existsSync(billingPagePath), 'Billing page.js must exist');
  const src = fs.readFileSync(billingPagePath, 'utf-8');
  assert.ok(src.includes('getServerSession'), 'Billing page must be authenticated via getServerSession');
  assert.ok(src.includes('BillingClient'), 'Billing page must render BillingClient');
  assert.ok(!src.includes("'use client'"), 'Billing page must be a Server Component');
});

await check('nav: centralized getNavItems() includes /dashboard/billing', () => {
  const items = getNavItems(false);
  const billingItem = items.find((i) => i.href === '/dashboard/billing');
  assert.ok(billingItem, 'getNavItems must include /dashboard/billing');
  assert.equal(billingItem.label, 'Billing');
  assert.ok(billingItem.icon, 'Billing nav item must have an icon');
});

await check('nav: AppSidebar, MobileNavBar, and PageTitle all consume getNavItems()', () => {
  const sidebarSrc = fs.readFileSync(path.join(projectRoot, 'components/layout/AppSidebar.js'), 'utf-8');
  const mobileNavSrc = fs.readFileSync(path.join(projectRoot, 'components/layout/MobileNavBar.js'), 'utf-8');
  const titleSrc = fs.readFileSync(path.join(projectRoot, 'components/layout/PageTitle.js'), 'utf-8');

  assert.ok(sidebarSrc.includes('getNavItems'), 'AppSidebar must consume getNavItems');
  assert.ok(mobileNavSrc.includes('getNavItems'), 'MobileNavBar must consume getNavItems');
  assert.ok(titleSrc.includes('getNavItems'), 'PageTitle must consume getNavItems');
});

await check('nav: no duplicate navigation arrays introduced', () => {
  const layoutSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/layout.js'), 'utf-8');
  assert.ok(!layoutSrc.includes("href: '/dashboard/billing'"), 'layout.js must not hardcode nav items');
});

// ==========================================
// 2. Current Plan Resolution & Presentation
// ==========================================

await check('presentation: no subscription resolves to Free display', () => {
  const ent = resolveEntitlements(null);
  const pres = formatBillingPresentation(ent, null);

  assert.equal(pres.effectivePlan, 'free');
  assert.equal(pres.effectivePlanName, 'Free');
  assert.equal(pres.displayStatus, 'Free Account');
  assert.equal(pres.statusBadge, 'Active');
  assert.equal(pres.isPro, false);
  for (const k of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(pres.features[k], false);
  }
});

await check('presentation: active Pro resolves to Pro display', () => {
  const sub = { plan: 'pro', status: 'active', currentPeriodEnd: new Date('2026-09-15T00:00:00Z') };
  const ent = resolveEntitlements(sub);
  const pres = formatBillingPresentation(ent, sub);

  assert.equal(pres.effectivePlan, 'pro');
  assert.equal(pres.effectivePlanName, 'Pro');
  assert.equal(pres.displayStatus, 'Pro Plan');
  assert.equal(pres.statusBadge, 'Active');
  assert.equal(pres.isPro, true);
  assert.ok(pres.periodEndLabel.includes('2026'));
  for (const k of Object.values(FEATURE_KEYS)) {
    assert.strictEqual(pres.features[k], true);
  }
});

await check('presentation: trialing Pro resolves to entitled Pro Trial display', () => {
  const sub = { plan: 'pro', status: 'trialing' };
  const ent = resolveEntitlements(sub);
  const pres = formatBillingPresentation(ent, sub);

  assert.equal(pres.effectivePlan, 'pro');
  assert.equal(pres.displayStatus, 'Pro Trial');
  assert.equal(pres.statusBadge, 'Trialing');
  assert.equal(pres.isPro, true);
});

await check('presentation: incomplete subscription resolves to Free with Setup Incomplete badge', () => {
  const sub = { plan: 'pro', status: 'incomplete' };
  const ent = resolveEntitlements(sub);
  const pres = formatBillingPresentation(ent, sub);

  assert.equal(pres.effectivePlan, 'free');
  assert.equal(pres.displayStatus, 'Free Account');
  assert.equal(pres.statusBadge, 'Setup Incomplete');
  assert.equal(pres.isPro, false);
});

await check('presentation: expired subscription resolves to Free with Previous Pro Expired badge', () => {
  const sub = { plan: 'pro', status: 'expired' };
  const ent = resolveEntitlements(sub);
  const pres = formatBillingPresentation(ent, sub);

  assert.equal(pres.effectivePlan, 'free');
  assert.equal(pres.statusBadge, 'Previous Pro Expired');
  assert.equal(pres.isPro, false);
});

await check('presentation: canceled subscription resolves to Free with Subscription Canceled badge', () => {
  const sub = { plan: 'pro', status: 'canceled' };
  const ent = resolveEntitlements(sub);
  const pres = formatBillingPresentation(ent, sub);

  assert.equal(pres.effectivePlan, 'free');
  assert.equal(pres.statusBadge, 'Subscription Canceled');
  assert.equal(pres.isPro, false);
});

await check('presentation: past_due subscription resolves to Free with Payment Past Due badge', () => {
  const sub = { plan: 'pro', status: 'past_due' };
  const ent = resolveEntitlements(sub);
  const pres = formatBillingPresentation(ent, sub);

  assert.equal(pres.effectivePlan, 'free');
  assert.equal(pres.statusBadge, 'Payment Past Due');
  assert.equal(pres.isPro, false);
});

await check('presentation: cancelAtPeriodEnd flag is cleanly reflected', () => {
  const sub = { plan: 'pro', status: 'active', cancelAtPeriodEnd: true };
  const ent = resolveEntitlements(sub);
  const pres = formatBillingPresentation(ent, sub);

  assert.equal(pres.cancelAtPeriodEnd, true);
  assert.equal(pres.isPro, true);
});

// ==========================================
// 3. Safety & Data Privacy
// ==========================================

await check('safety: Billing page queries subscription strictly using session.user.id', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/dashboard/billing/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('getSubscriptionByUserId(session.user.id)'));
  assert.ok(pageSrc.includes('getSafeUserEntitlements(session.user.id)'));
  assert.ok(!pageSrc.includes('getSubscriptionByUserId(session.user.email)'));
});

await check('safety: raw Subscription fields and provider secrets are stripped from presentation', () => {
  const dirtySub = {
    _id: '507f1f77bcf86cd799439011',
    userId: '507f191e810c19729de860ea',
    plan: 'pro',
    status: 'active',
    provider: 'stripe',
    providerCustomerId: 'cus_sec_123',
    providerSubscriptionId: 'sub_sec_123',
    secretToken: 'sk_12345',
  };
  const ent = resolveEntitlements(dirtySub);
  const pres = formatBillingPresentation(ent, dirtySub);

  assert.strictEqual(pres._id, undefined);
  assert.strictEqual(pres.userId, undefined);
  assert.strictEqual(pres.providerCustomerId, undefined);
  assert.strictEqual(pres.providerSubscriptionId, undefined);
  assert.strictEqual(pres.secretToken, undefined);
  assert.strictEqual(pres.provider, undefined);
});

await check('safety: presentation model is JSON-serializable', () => {
  const ent = resolveEntitlements(null);
  const pres = formatBillingPresentation(ent, null);
  const json = JSON.stringify(pres);
  const parsed = JSON.parse(json);
  assert.deepEqual(pres, parsed);
});

// ==========================================
// 4. Plans UI & Content Invariants
// ==========================================

await check('ui: FREE_BASELINE_FEATURES contains baseline v2 capabilities', () => {
  assert.ok(FREE_BASELINE_FEATURES.length >= 10, 'Must document complete baseline feature set');
  const joined = FREE_BASELINE_FEATURES.join(' ');
  assert.ok(joined.includes('profile'));
  assert.ok(joined.includes('Tip Jar'));
  assert.ok(joined.includes('embeds'));
  assert.ok(joined.includes('analytics'));
  assert.ok(joined.includes('CSV'));
  assert.ok(joined.includes('QR'));
});

await check('ui: PRO_ROADMAP_FEATURES contains planned monetization capabilities with status badges', () => {
  assert.ok(PRO_ROADMAP_FEATURES.length === 5, 'Must contain all 5 planned Pro features');
  for (const item of PRO_ROADMAP_FEATURES) {
    assert.ok(item.title, 'Pro item must have title');
    assert.ok(item.description, 'Pro item must have description');
    assert.ok(item.status.includes('Upcoming') || item.status.includes('Planned'), 'Must have upcoming or planned status');
  }
});

await check('ui: zero hardcoded prices exist in presentation or client component', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/BillingClient.js'), 'utf-8');
  const presSrc = fs.readFileSync(path.join(projectRoot, 'lib/billingPresentation.js'), 'utf-8');

  const forbiddenPricePatterns = [/₹\s*\d+/, /\$\s*\d+/, /₹0/, /₹499/, /199/, /299/, /499/];
  for (const pattern of forbiddenPricePatterns) {
    assert.ok(!pattern.test(clientSrc), `BillingClient must not match price pattern ${pattern}`);
    assert.ok(!pattern.test(presSrc), `billingPresentation must not match price pattern ${pattern}`);
  }
});

await check('ui: Upgrade to Pro CTA in BillingClient opens informational modal without fake mutation', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/BillingClient.js'), 'utf-8');
  assert.ok(clientSrc.includes('Upgrade to Pro'));
  assert.ok(clientSrc.includes('setIsModalOpen(true)'));
  assert.ok(clientSrc.includes('Pro Subscriptions Launching Soon'));
  assert.ok(!clientSrc.includes('/api/checkout'));
  assert.ok(!clientSrc.includes('fetch('));
});

await check('ui: Pro state renders active badge and disables Upgrade CTA', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/BillingClient.js'), 'utf-8');
  assert.ok(clientSrc.includes('Pro Plan Active'));
  assert.ok(clientSrc.includes('isPro ?'));
});

// ==========================================
// 5. Architectural Boundaries & Safety
// ==========================================

await check('safety: zero checkout or billing API routes created', () => {
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/checkout')));
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/stripe')));
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/razorpay')));
  assert.ok(!fs.existsSync(path.join(projectRoot, 'app/api/billing')));
});

await check('safety: zero custom-domain or extended analytics controls in Billing UI', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/billing/BillingClient.js'), 'utf-8');
  assert.ok(!clientSrc.includes('Add Domain'));
  assert.ok(!clientSrc.includes('DNS Records'));
  assert.ok(!clientSrc.includes('90-day filter'));
});

await check('safety: public profile branding and existing features remain untouched', () => {
  const publicPageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(publicPageSrc.includes('Made with Linktree'));
});

await check('safety: zero new npm dependencies in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps['react-modal']);
  assert.ok(!allDeps['@headlessui/react']);
});

await check('regression: prior wave suites (Wave 1..4) remain 100% green', () => {
  const w1 = execSync('node scripts/verify-v2.1-wave1.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w1.includes('FAILED:  0'));

  const w2 = execSync('node scripts/verify-v2.1-wave2.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w2.includes('FAILED:  0'));

  const w3 = execSync('node scripts/verify-v2.1-wave3.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w3.includes('FAILED:  0'));

  const w4 = execSync('node scripts/verify-v2.1-wave4.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w4.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 5 Billing & Plans UI Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
