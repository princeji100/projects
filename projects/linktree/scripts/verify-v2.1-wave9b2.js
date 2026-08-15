import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { COMMERCIAL_IDENTITY, PRICING_DETAILS } from '../lib/compliance.js';
import { PRODUCT_NAME, DEFAULT_PLATFORM_DOMAIN } from '../lib/brand.js';

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

console.log('--- Running Milestone v2.1 Wave 9B-2: Compliance Discoverability & Review Audit ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Navigation & Public Discoverability
// ==========================================

await check('nav: Pricing is discoverable in top Header navigation', () => {
  const headerSrc = fs.readFileSync(path.join(projectRoot, 'components/Header.js'), 'utf-8');
  assert.ok(headerSrc.includes('href="/pricing"'));
  assert.ok(headerSrc.includes('Pricing'));
});

await check('footer: shared Footer component exists and is mounted in default layout', () => {
  assert.ok(fs.existsSync(path.join(projectRoot, 'components/Footer.js')));
  const layoutSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/layout.js'), 'utf-8');
  assert.ok(layoutSrc.includes('<Footer />') || layoutSrc.includes('<Footer/>'));
});

await check('footer: all 6 compliance routes are linked from public footer', () => {
  const footerSrc = fs.readFileSync(path.join(projectRoot, 'components/Footer.js'), 'utf-8');
  assert.ok(footerSrc.includes('href="/pricing"'), 'Footer must link to /pricing');
  assert.ok(footerSrc.includes('href="/terms"'), 'Footer must link to /terms');
  assert.ok(footerSrc.includes('href="/privacy"'), 'Footer must link to /privacy');
  assert.ok(footerSrc.includes('href="/refund-policy"'), 'Footer must link to /refund-policy');
  assert.ok(footerSrc.includes('href="/delivery-policy"'), 'Footer must link to /delivery-policy');
  assert.ok(footerSrc.includes('href="/contact"'), 'Footer must link to /contact');
  assert.ok(footerSrc.includes('href="/about"'), 'Footer must link to /about');
});

// ==========================================
// 2. Unauthenticated Public Access
// ==========================================

await check('routes: all six compliance routes exist and require zero auth wrappers', () => {
  const publicRoutes = [
    'app/(default)/pricing/page.js',
    'app/(default)/terms/page.js',
    'app/(default)/privacy/page.js',
    'app/(default)/refund-policy/page.js',
    'app/(default)/delivery-policy/page.js',
    'app/(default)/contact/page.js',
  ];

  for (const relPath of publicRoutes) {
    const src = fs.readFileSync(path.join(projectRoot, relPath), 'utf-8');
    assert.ok(!src.includes('getServerSession'), `${relPath} should not require server auth redirect`);
    assert.ok(!src.includes('redirect('), `${relPath} should not force redirect`);
  }
});

// ==========================================
// 3. Commercial Identity & Support Accuracy
// ==========================================

await check('identity: operator is PRINCE under princeji brand and product is Prince Links', () => {
  assert.equal(COMMERCIAL_IDENTITY.productName, 'Prince Links');
  assert.equal(COMMERCIAL_IDENTITY.operatorName, 'PRINCE');
  assert.equal(COMMERCIAL_IDENTITY.brandName, 'princeji');
  assert.equal(COMMERCIAL_IDENTITY.businessType, 'Individual');
});

await check('support: public support email is support@princeji.com with mailto link', () => {
  assert.equal(COMMERCIAL_IDENTITY.supportEmail, 'support@princeji.com');
  const footerSrc = fs.readFileSync(path.join(projectRoot, 'components/Footer.js'), 'utf-8');
  assert.ok(footerSrc.includes('mailto:support@princeji.com') || footerSrc.includes('COMMERCIAL_IDENTITY.supportEmail'));
});

await check('support: reviewer email is NOT published on any public page', () => {
  const publicFiles = [
    'components/Header.js',
    'components/Footer.js',
    'components/compliance/PolicyLayout.js',
    'app/(default)/page.js',
    'app/(default)/about/page.js',
    'app/(default)/pricing/page.js',
    'app/(default)/terms/page.js',
    'app/(default)/privacy/page.js',
    'app/(default)/refund-policy/page.js',
    'app/(default)/delivery-policy/page.js',
    'app/(default)/contact/page.js',
  ];

  for (const relPath of publicFiles) {
    const src = fs.readFileSync(path.join(projectRoot, relPath), 'utf-8');
    assert.ok(!src.includes('razorpay-review@princeji.com'), `${relPath} must not publish reviewer email`);
    assert.ok(!src.includes('linktree-princeji.vercel.app'), `${relPath} must not contain old Vercel URL`);
  }
});

// ==========================================
// 4. Commercial Wording & Pricing Micro-Fixes
// ==========================================

await check('pricing: ₹0/month Free tier and ₹149/month Pro with NO forever promise', () => {
  const pricingSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/pricing/page.js'), 'utf-8');
  assert.ok(pricingSrc.includes('₹149') || pricingSrc.includes('PRICING_DETAILS.pro.price'));
  assert.ok(pricingSrc.includes('₹0') || pricingSrc.includes('PRICING_DETAILS.free.price'));
  assert.equal(PRICING_DETAILS.free.price, '₹0');
  assert.equal(PRICING_DETAILS.pro.price, '₹149');
  assert.ok(!pricingSrc.includes('forever'), 'Pricing must not promise "forever"');
  assert.ok(!pricingSrc.includes('permanently available'));
  assert.ok(!pricingSrc.includes('free trial'));
  assert.ok(!pricingSrc.includes('yearly plan'));
  assert.ok(!pricingSrc.includes('yearly discount'));
  assert.ok(!pricingSrc.includes('annual plan'));
});

await check('delivery: digital delivery policy avoids absolute instant activation promise', () => {
  const deliverySrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/delivery-policy/page.js'), 'utf-8');
  assert.ok(deliverySrc.includes('Digital Fulfillment & Activation') || deliverySrc.includes('Digital Fulfillment &amp; Activation'));
  assert.ok(deliverySrc.includes('Activation is normally automatic after verification, but technical delays may occasionally occur'));
  assert.ok(!deliverySrc.includes('Instant Account Activation'));
  assert.ok(deliverySrc.includes('No Physical Shipping'));
});

await check('features: working Pro features clearly separated from planned features', () => {
  const pricingSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/pricing/page.js'), 'utf-8');
  assert.ok(pricingSrc.includes('Remove Platform Branding'));
  assert.ok(pricingSrc.includes('90-Day Analytics History'));
  assert.ok(pricingSrc.includes('1-Year Analytics History'));
  assert.ok(pricingSrc.includes('Custom Domain Mapping'));
  assert.ok(pricingSrc.includes('Multiple Profiles'));
  assert.ok(pricingSrc.includes('Advanced SEO & Social Previews'));
  assert.ok(pricingSrc.includes('Planned'));
});

await check('honesty: zero claims of active payment checkout or automated cancellation', () => {
  const pricingSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/pricing/page.js'), 'utf-8');
  const refundSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/refund-policy/page.js'), 'utf-8');

  assert.ok(pricingSrc.includes('Online checkout is being prepared'));
  assert.ok(refundSrc.includes('While self-service automated billing management is being finalized'));
  assert.ok(!pricingSrc.includes('data-payment-button'));
  assert.ok(!refundSrc.includes('Click here to cancel immediately'));
});

// ==========================================
// 5. Internal Cross-Link Integrity
// ==========================================

await check('cross-links: all internal policy cross-links resolve to existing routes', () => {
  const filesToCheck = [
    'app/(default)/pricing/page.js',
    'app/(default)/terms/page.js',
    'app/(default)/privacy/page.js',
    'app/(default)/refund-policy/page.js',
    'app/(default)/delivery-policy/page.js',
    'app/(default)/contact/page.js',
    'components/Footer.js',
  ];

  const validTargets = ['/pricing', '/terms', '/privacy', '/refund-policy', '/delivery-policy', '/contact', '/about', '/login', '/dashboard/billing', '/'];

  for (const relPath of filesToCheck) {
    const src = fs.readFileSync(path.join(projectRoot, relPath), 'utf-8');
    const hrefMatches = src.matchAll(/href=["'](\/[a-z0-9\-_/]*)["']/g);
    for (const match of hrefMatches) {
      const target = match[1];
      assert.ok(validTargets.includes(target), `Invalid href target ${target} in ${relPath}`);
    }
  }
});

// ==========================================
// 6. Security, Payment & Auth Isolation
// ==========================================

await check('safety: zero Razorpay SDK/keys or CredentialsProvider added in 9B-2', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay);
  assert.ok(!allDeps.stripe);

  const authRoute = fs.readFileSync(path.join(projectRoot, 'app/api/auth/[...nextauth]/route.js'), 'utf-8');
  assert.ok(!authRoute.includes('CredentialsProvider'));
});

await check('safety: zero database schema alterations', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  const subSrc = fs.readFileSync(path.join(projectRoot, 'models/Subscription.js'), 'utf-8');

  assert.ok(!userSrc.includes('password'));
  assert.ok(!pageSrc.includes('subscription'));
  assert.ok(subSrc.includes('userId: {'));
});

// ==========================================
// 7. Regression Suite
// ==========================================

await check('regression: all prior wave suites (Wave 1..9B1) remain 100% green', () => {
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

  const w9a = execSync('node scripts/verify-v2.1-wave9a.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w9a.includes('FAILED:  0'));

  const w9b1 = execSync('node scripts/verify-v2.1-wave9b1.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w9b1.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 9B-2 Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
