import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { COMMERCIAL_IDENTITY, PRICING_DETAILS } from '../lib/compliance.js';
import { PRODUCT_NAME } from '../lib/brand.js';

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

console.log('--- Running Milestone v2.1 Wave 9B-2A: Public Contact Email Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Canonical Public Contact Email
// ==========================================

await check('compliance: canonical public contact is contact@princeji.com', () => {
  assert.equal(COMMERCIAL_IDENTITY.supportEmail, 'contact@princeji.com');
  assert.equal(COMMERCIAL_IDENTITY.contactEmail, 'contact@princeji.com');
});

// ==========================================
// 2. Public Mailto Links & Public Surfaces
// ==========================================

const publicFiles = [
  'lib/compliance.js',
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

await check('support: all customer-facing files have zero mentions of support@princeji.com', () => {
  for (const relPath of publicFiles) {
    const src = fs.readFileSync(path.join(projectRoot, relPath), 'utf-8');
    assert.ok(
      !src.includes('support@princeji.com'),
      `File ${relPath} still contains old support@princeji.com`
    );
  }
});

await check('support: help@princeji.com is NOT exposed as public customer support', () => {
  for (const relPath of publicFiles) {
    const src = fs.readFileSync(path.join(projectRoot, relPath), 'utf-8');
    assert.ok(
      !src.includes('help@princeji.com'),
      `File ${relPath} must not expose help@princeji.com as public support`
    );
  }
});

// ==========================================
// 3. Business Identity & Commercial Invariants
// ==========================================

await check('identity: operator is PRINCE under princeji brand and product is Prince Links', () => {
  assert.equal(COMMERCIAL_IDENTITY.productName, 'Prince Links');
  assert.equal(COMMERCIAL_IDENTITY.operatorName, 'PRINCE');
  assert.equal(COMMERCIAL_IDENTITY.brandName, 'princeji');
  assert.equal(COMMERCIAL_IDENTITY.businessType, 'Individual');
});

await check('pricing: ₹149/month Pro and ₹0/month Free remain intact', () => {
  assert.equal(PRICING_DETAILS.pro.price, '₹149');
  assert.equal(PRICING_DETAILS.pro.interval, 'month');
  assert.equal(PRICING_DETAILS.free.price, '₹0');
});

// ==========================================
// 4. Auth & Payment Code Isolation
// ==========================================

await check('safety: zero auth changes (Google OAuth/NextAuth intact, no reviewer auth yet)', () => {
  const authRoute = fs.readFileSync(path.join(projectRoot, 'app/api/auth/[...nextauth]/route.js'), 'utf-8');
  assert.ok(!authRoute.includes('CredentialsProvider'));
  assert.ok(!authRoute.includes('contact@princeji.com'));
});

await check('safety: zero payment integration or dependencies added', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.razorpay);
  assert.ok(!allDeps.stripe);
});

// ==========================================
// 5. Regression Test Run
// ==========================================

await check('regression: all prior wave verification suites pass cleanly', () => {
  const w9b1 = execSync('node scripts/verify-v2.1-wave9b1.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w9b1.includes('FAILED:  0'));

  const w9b2 = execSync('node scripts/verify-v2.1-wave9b2.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w9b2.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 9B-2A Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
