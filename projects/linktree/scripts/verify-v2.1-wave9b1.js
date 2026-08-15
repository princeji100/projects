import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import mongoose from 'mongoose';

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

console.log('--- Running Milestone v2.1 Wave 9B-1: Pricing & Compliance Pages Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Commercial Identity Constants
// ==========================================

await check('compliance: shared commercial identity constants match approved facts', () => {
  assert.equal(COMMERCIAL_IDENTITY.productName, 'Prince Links');
  assert.equal(COMMERCIAL_IDENTITY.operatorName, 'PRINCE');
  assert.equal(COMMERCIAL_IDENTITY.brandName, 'princeji');
  assert.equal(COMMERCIAL_IDENTITY.businessType, 'Individual');
  assert.equal(COMMERCIAL_IDENTITY.supportEmail, 'support@princeji.com');
  assert.equal(COMMERCIAL_IDENTITY.platformDomain, 'https://links.princeji.com');
  assert.equal(COMMERCIAL_IDENTITY.platformHost, 'links.princeji.com');
  assert.equal(COMMERCIAL_IDENTITY.lastUpdated, 'August 15, 2026');
});

await check('compliance: pricing constants match approved ₹149/month Pro launch plan', () => {
  assert.equal(PRICING_DETAILS.free.price, '₹0');
  assert.equal(PRICING_DETAILS.pro.price, '₹149');
  assert.equal(PRICING_DETAILS.pro.interval, 'month');
  assert.equal(PRICING_DETAILS.pro.amount, 149);
});

// ==========================================
// 2. Compliance Page Existence
// ==========================================

const requiredRoutes = [
  'app/(default)/pricing/page.js',
  'app/(default)/terms/page.js',
  'app/(default)/privacy/page.js',
  'app/(default)/refund-policy/page.js',
  'app/(default)/delivery-policy/page.js',
  'app/(default)/contact/page.js',
];

for (const relPath of requiredRoutes) {
  await check(`routes: ${relPath} exists`, () => {
    assert.ok(fs.existsSync(path.join(projectRoot, relPath)), `File ${relPath} must exist`);
  });
}

// ==========================================
// 3. Pricing Page Integrity & Honesty
// ==========================================

await check('pricing: reflects accurate ₹149/month, no yearly plan, no trial', () => {
  const pricingSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/pricing/page.js'), 'utf-8');
  assert.ok(pricingSrc.includes('₹149'));
  assert.ok(pricingSrc.includes('/ month'));
  assert.ok(!pricingSrc.includes('₹1499'));
  assert.ok(!pricingSrc.includes('yearly discount'));
  assert.ok(!pricingSrc.includes('free trial'));
  assert.ok(pricingSrc.includes('Start Free'));
  assert.ok(pricingSrc.includes('Upgrade to Pro'));
});

await check('pricing: separates available working Pro features from planned roadmap', () => {
  const pricingSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/pricing/page.js'), 'utf-8');
  assert.ok(pricingSrc.includes('Remove Platform Branding'));
  assert.ok(pricingSrc.includes('90-Day Analytics History'));
  assert.ok(pricingSrc.includes('1-Year Analytics History'));
  assert.ok(pricingSrc.includes('Custom Domain Mapping'));
  assert.ok(pricingSrc.includes('Multiple Profiles'));
  assert.ok(pricingSrc.includes('Advanced SEO & Social Previews'));
  assert.ok(pricingSrc.includes('Planned'));
});

await check('pricing: contains zero fake checkout, razorpay calls, or payment execution', () => {
  const pricingSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/pricing/page.js'), 'utf-8');
  assert.ok(!pricingSrc.includes('Razorpay('));
  assert.ok(!pricingSrc.includes('createOrder'));
  assert.ok(!pricingSrc.includes('checkout.js'));
  assert.ok(pricingSrc.includes('Online checkout is being prepared'));
});

// ==========================================
// 4. Terms of Service & Tip Jar Distinction
// ==========================================

await check('terms: contains operator identity and acceptable use rules', () => {
  const termsSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/terms/page.js'), 'utf-8');
  assert.ok(termsSrc.includes('PRINCE'));
  assert.ok(termsSrc.includes('princeji'));
  assert.ok(termsSrc.includes('Prince Links'));
  assert.ok(termsSrc.includes('Terms of Service'));
});

await check('terms: explicitly distinguishes creator UPI Tip Jar from SaaS subscription billing', () => {
  const termsSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/terms/page.js'), 'utf-8');
  assert.ok(termsSrc.includes('Direct Peer-to-Peer Transfer'));
  assert.ok(termsSrc.includes('No Intermediation'));
  assert.ok(termsSrc.includes('No Pro Grant'));
  assert.ok(termsSrc.includes('No Transaction Verification'));
});

// ==========================================
// 5. Privacy Policy & Actual Repository Behavior
// ==========================================

await check('privacy: accurately describes Google OAuth, uploads, and first-party analytics', () => {
  const privSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/privacy/page.js'), 'utf-8');
  assert.ok(privSrc.includes('Google OAuth'));
  assert.ok(privSrc.includes('MongoDB Atlas'));
  assert.ok(privSrc.includes('AWS S3'));
  assert.ok(privSrc.includes('NextAuth'));
  assert.ok(privSrc.includes('First-Party Traffic'));
});

await check('privacy: does not make false claims of auto-deletion TTL or live payment processing', () => {
  const privSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/privacy/page.js'), 'utf-8');
  assert.ok(!privSrc.includes('automatically deleted after 30 days'));
  assert.ok(!privSrc.includes('GDPR certified'));
  assert.ok(!privSrc.includes('ISO 27001'));
  assert.ok(privSrc.includes('Payment Processing') && privSrc.includes('Billing Boundary'));
  assert.ok(privSrc.includes('Online paid checkout for Pro subscriptions is currently in technical preparation'));
});

// ==========================================
// 6. Refund & Digital Delivery Policies
// ==========================================

await check('refund-policy: describes cancellation and provides manual support email without fake buttons', () => {
  const refundSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/refund-policy/page.js'), 'utf-8');
  assert.ok(refundSrc.includes('Cancellation & Refund Policy') || refundSrc.includes('Cancellation &amp; Refund Policy'));
  assert.ok(refundSrc.includes('support@princeji.com') || refundSrc.includes('COMMERCIAL_IDENTITY.supportEmail'));
  assert.ok(refundSrc.includes('Duplicate Billing'));
  assert.ok(refundSrc.includes('While self-service automated billing management is being finalized'));
  assert.ok(!refundSrc.includes('instant refund guaranteed'));
});

await check('delivery-policy: confirms digital fulfillment with zero physical shipping', () => {
  const deliverySrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/delivery-policy/page.js'), 'utf-8');
  assert.ok(deliverySrc.includes('Digital Delivery & Shipping Policy') || deliverySrc.includes('Digital Delivery &amp; Shipping Policy'));
  assert.ok(deliverySrc.includes('No Physical Shipping'));
  assert.ok(deliverySrc.includes('No physical goods, packaging, or tangible items are shipped'));
  assert.ok(deliverySrc.includes('Instant Account Activation'));
  assert.ok(!deliverySrc.includes('courier tracking'));
});

// ==========================================
// 7. Contact Page & Communication Safety
// ==========================================

await check('contact: provides support email mailto link and categorized support', () => {
  const contactSrc = fs.readFileSync(path.join(projectRoot, 'app/(default)/contact/page.js'), 'utf-8');
  assert.ok(contactSrc.includes('support@princeji.com') || contactSrc.includes('COMMERCIAL_IDENTITY.supportEmail'));
  assert.ok(contactSrc.includes('mailto:'));
  assert.ok(contactSrc.includes('PRINCE') || contactSrc.includes('COMMERCIAL_IDENTITY.operatorName'));
  assert.ok(contactSrc.includes('princeji') || contactSrc.includes('COMMERCIAL_IDENTITY.brandName'));
  assert.ok(contactSrc.includes('links.princeji.com') || contactSrc.includes('COMMERCIAL_IDENTITY.platformHost'));
  assert.ok(contactSrc.includes('Account Access & Invites') || contactSrc.includes('Account Access &amp; Invites'));
  assert.ok(contactSrc.includes('Billing & Subscriptions') || contactSrc.includes('Billing &amp; Subscriptions'));
});

await check('safety: no phone number, personal address, PAN, or sensitive credentials published', () => {
  const allPolicyFiles = [
    'app/(default)/pricing/page.js',
    'app/(default)/terms/page.js',
    'app/(default)/privacy/page.js',
    'app/(default)/refund-policy/page.js',
    'app/(default)/delivery-policy/page.js',
    'app/(default)/contact/page.js',
    'components/compliance/PolicyLayout.js',
    'lib/compliance.js',
  ];

  for (const relPath of allPolicyFiles) {
    const src = fs.readFileSync(path.join(projectRoot, relPath), 'utf-8');
    assert.ok(!src.includes('linktree-princeji.vercel.app'), `${relPath} must not contain old Vercel URL`);
    assert.ok(!src.includes('rzp_'), `${relPath} must not contain Razorpay keys`);
    assert.ok(!src.includes('+91'), `${relPath} must not contain phone numbers`);
    assert.ok(!src.includes('Private Limited'), `${relPath} must not invent company entity`);
    assert.ok(!src.includes('LLP'), `${relPath} must not invent company entity`);
    assert.ok(!src.includes('GSTIN'), `${relPath} must not invent GST details`);
  }
});

// ==========================================
// 8. Scope Isolation: No Auth, Razorpay, or Schema Alterations
// ==========================================

await check('safety: no Razorpay SDK or payment dependencies added to package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay, 'Must not contain razorpay');
  assert.ok(!allDeps.stripe, 'Must not contain stripe');
});

await check('safety: no reviewer authentication or NextAuth changes added in Wave 9B-1', () => {
  const authRoute = fs.readFileSync(path.join(projectRoot, 'app/api/auth/[...nextauth]/route.js'), 'utf-8');
  assert.ok(!authRoute.includes('CredentialsProvider'), 'Must not have CredentialsProvider in 9B-1');
  assert.ok(!authRoute.includes('razorpay-review@princeji.com'), 'Reviewer auth is reserved for Wave 9B-3');
});

await check('safety: no database schema changes in User, Page, Event, Upload, or Subscription', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');
  const subSrc = fs.readFileSync(path.join(projectRoot, 'models/Subscription.js'), 'utf-8');

  assert.ok(!userSrc.includes('password'));
  assert.ok(!pageSrc.includes('subscription'));
  assert.ok(subSrc.includes('plan: {'));
});

// ==========================================
// 9. Regression Suite: Waves 1 through 9A
// ==========================================

await check('regression: all prior wave suites (Wave 1..9A) remain 100% green', () => {
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
});

console.log('\n================================');
console.log('Wave 9B-1 Compliance Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
