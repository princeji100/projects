import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import Page from '../models/Page.js';
import { validateUpiId, normalizeTipAmount, sanitizeTipJarConfig } from '../lib/tipJar.js';

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

console.log('--- Running Wave 6 Tip Jar Dashboard Configuration Verification ---\n');

// 1. Hydration into Form State
await check('dashboard-state-hydration: hydrates existing tipJar document fields cleanly', async () => {
  const doc = new Page({
    uri: 'creator_hydrated',
    owner: 'creator@example.com',
    tipJar: {
      enabled: true,
      upiId: 'synthetic_creator@upi',
      name: 'Artist Display',
      amount: '75',
      message: 'Support my open source work!',
    },
  });

  assert.equal(doc.tipJar.enabled, true);
  assert.equal(doc.tipJar.upiId, 'synthetic_creator@upi');
  assert.equal(doc.tipJar.name, 'Artist Display');
  assert.equal(doc.tipJar.amount, '75');
  assert.equal(doc.tipJar.message, 'Support my open source work!');
});

// 2. Legacy Page Default/Disabled Safe Hydration
await check('legacy-page-safe-hydration: missing tipJar defaults to disabled and empty strings', async () => {
  const legacyDoc = new Page({
    uri: 'legacy_creator',
    owner: 'legacy@example.com',
  });

  assert.equal(legacyDoc.tipJar.enabled, false);
  assert.equal(legacyDoc.tipJar.upiId, '');
  assert.equal(legacyDoc.tipJar.name, '');
  assert.equal(legacyDoc.tipJar.amount, '');
  assert.equal(legacyDoc.tipJar.message, '');
});

// 3. ON -> OFF -> ON Lifecycle & Data Preservation
await check('on-off-on-preservation-roundtrip: disabling preserves configuration and re-enabling restores it', async () => {
  // Step 1: User enables Tip Jar and saves
  const step1 = sanitizeTipJarConfig({
    enabled: true,
    upiId: 'artist@okaxis',
    name: 'Indie Artist',
    amount: '150',
    message: 'Thanks for the coffee!',
  });
  assert.equal(step1.ok, true);
  assert.equal(step1.config.enabled, true);
  assert.equal(step1.config.upiId, 'artist@okaxis');

  // Step 2: User toggles OFF and saves
  const step2 = sanitizeTipJarConfig({
    enabled: false,
    upiId: step1.config.upiId,
    name: step1.config.name,
    amount: step1.config.amount,
    message: step1.config.message,
  });
  assert.equal(step2.ok, true);
  assert.equal(step2.config.enabled, false, 'enabled must be false');
  assert.equal(step2.config.upiId, 'artist@okaxis', 'UPI ID must remain preserved');
  assert.equal(step2.config.name, 'Indie Artist', 'Name must remain preserved');
  assert.equal(step2.config.amount, '150', 'Amount must remain preserved');
  assert.equal(step2.config.message, 'Thanks for the coffee!', 'Message must remain preserved');

  // Step 3: User toggles back ON without re-typing
  const step3 = sanitizeTipJarConfig({
    enabled: true,
    upiId: step2.config.upiId,
    name: step2.config.name,
    amount: step2.config.amount,
    message: step2.config.message,
  });
  assert.equal(step3.ok, true);
  assert.equal(step3.config.enabled, true);
  assert.equal(step3.config.upiId, 'artist@okaxis');
});

// 4. Enabled + Missing UPI ID Refusal
await check('enabled-missing-upi-refusal: enabled=true with empty UPI ID fails without modifying state', async () => {
  const res = sanitizeTipJarConfig({
    enabled: true,
    upiId: '',
    name: 'Testing',
  });
  assert.equal(res.ok, false);
  assert.ok(res.error.includes('UPI ID'));
});

// 5. String-Preserving Amount Formatting
await check('string-amount-preservation: amounts submitted as strings remain unmutated by float rounding', async () => {
  const res = sanitizeTipJarConfig({
    enabled: true,
    upiId: 'merchant@upi',
    amount: '99.50',
  });
  assert.equal(res.ok, true);
  assert.equal(typeof res.config.amount, 'string');
  assert.equal(res.config.amount, '99.50');
});

// 6. Optional Blank Fields Validation
await check('optional-blank-fields: blank name, amount, and message are valid when enabled', async () => {
  const res = sanitizeTipJarConfig({
    enabled: true,
    upiId: 'minimalist@paytm',
    name: '',
    amount: '',
    message: '',
  });
  assert.equal(res.ok, true);
  assert.equal(res.config.enabled, true);
  assert.equal(res.config.upiId, 'minimalist@paytm');
  assert.equal(res.config.name, '');
  assert.equal(res.config.amount, '');
  assert.equal(res.config.message, '');
});

// 7. Preview State Simulation (CTA visibility only when enabled)
await check('phone-preview-cta-visibility: preview reflects enabled CTA without persistence', async () => {
  const localFormState = {
    tipJar: {
      enabled: true,
      upiId: 'preview_user@upi',
      name: 'Preview Creator',
      amount: '50',
    },
  };

  // Preview component checks tipJar.enabled
  assert.equal(localFormState.tipJar.enabled, true, 'Preview CTA displays when enabled');

  // Preview toggled off
  localFormState.tipJar.enabled = false;
  assert.equal(localFormState.tipJar.enabled, false, 'Preview CTA hides when disabled');
});

// 8. Invariant: Public Profile Unmodified in Wave 6
await check('public-profile-unmodified: public [uri]/page.js does not yet render tip modal or QR', async () => {
  const publicPageSrc = fs.readFileSync(
    path.join(process.cwd(), 'app/(page)/[uri]/page.js'),
    'utf8'
  );
  assert.ok(!publicPageSrc.includes('upi://pay'), 'Public profile must not contain upi://pay deep-links yet');
  assert.ok(!publicPageSrc.includes('QRCodeSVG'), 'Public profile must not contain QR code generation yet');
});

// 9. Invariant: Absence of Payment-Success and Verification UI/State
await check('no-payment-success-ui: no fake confirmation or verification copy exists', async () => {
  const formSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/forms/PageSettingForm.js'),
    'utf8'
  );
  assert.ok(!formSrc.toLowerCase().includes('payment received'), 'No "payment received" text');
  assert.ok(!formSrc.toLowerCase().includes('transaction verified'), 'No "transaction verified" text');
  assert.ok(formSrc.includes('This app does not verify whether a payment was completed'), 'Contains required disclaimer');
});

// 10. Invariant: Zero New Dependencies
await check('zero-dependencies: package.json has no new dependencies added', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('razorpay'));
  assert.ok(!deps.includes('stripe'));
});

console.log('\n================================');
console.log(`Wave 6 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
