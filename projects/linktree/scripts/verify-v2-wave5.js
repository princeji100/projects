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

console.log('--- Running Wave 5 Tip Jar Data Model & Server Validation Verification ---\n');

// 1. Tip Jar Schema Definition & Additive Defaults
await check('schema-additive-defaults: PageSchema defines tipJar with default enabled=false', async () => {
  const doc = new Page({
    uri: 'tip_tester',
    owner: 'tip_tester@example.com',
  });

  assert.ok(doc.tipJar, 'tipJar subdocument must be initialized');
  assert.equal(doc.tipJar.enabled, false, 'Default enabled must be false');
  assert.equal(doc.tipJar.upiId, '', 'Default upiId must be empty string');
  assert.equal(doc.tipJar.name, '', 'Default name must be empty string');
  assert.equal(doc.tipJar.amount, '', 'Default amount must be empty string');
  assert.equal(doc.tipJar.message, '', 'Default message must be empty string');
});

// 2. Legacy Compatibility
await check('legacy-page-compatibility: legacy document without tipJar field behaves safely', async () => {
  const legacyDoc = new Page({
    uri: 'legacy_v1_page',
    owner: 'legacy@example.com',
    theme: 'emerald',
    font: 'outfit',
  });

  assert.equal(legacyDoc.tipJar.enabled, false);
  assert.equal(legacyDoc.theme, 'emerald');
  assert.equal(legacyDoc.font, 'outfit');
});

// 3. Enabled + Valid UPI ID Persistence
await check('enabled-valid-upi: valid synthetic UPI IDs persist and sanitize successfully', async () => {
  const validSyntheticVPAs = [
    'creator@upi',
    'support@okhdfcbank',
    'merchant123@okaxis',
    'my-store.india@ybl',
    'john_doe@paytm',
    'community@customhandle',
  ];

  for (const vpa of validSyntheticVPAs) {
    const res = sanitizeTipJarConfig({
      enabled: true,
      upiId: `  ${vpa}  `,
      name: '  Test Creator  ',
      amount: ' 50.00 ',
      message: ' Buy me a chai! ',
    });

    assert.equal(res.ok, true, `Should accept valid VPA: ${vpa}`);
    assert.equal(res.config.enabled, true);
    assert.equal(res.config.upiId, vpa);
    assert.equal(res.config.name, 'Test Creator');
    assert.equal(res.config.amount, '50.00');
    assert.equal(res.config.message, 'Buy me a chai!');
  }
});

// 4. Enabled + Missing/Empty UPI ID Rejection
await check('enabled-missing-upi-rejection: enabled=true with missing/empty UPI is rejected', async () => {
  const emptyInputs = ['', '   ', null, undefined];
  for (const emptyVal of emptyInputs) {
    const res = sanitizeTipJarConfig({
      enabled: true,
      upiId: emptyVal,
    });
    assert.equal(res.ok, false, 'Must reject enabled tip jar with empty UPI');
    assert.ok(res.error, 'Error message must be present');
  }
});

// 5. Malformed UPI ID Rejection
await check('malformed-upi-rejection: refuses invalid structures and injection attempts', async () => {
  const malformedList = [
    'creator',
    '@upi',
    'creator@',
    'creator @upi',
    'creator@bank@extra',
    'https://example.com',
    '<script>alert(1)</script>',
    'creator@bank.com/path',
    'user\nname@bank',
  ];

  for (const bad of malformedList) {
    const res = validateUpiId(bad);
    assert.equal(res.ok, false, `validateUpiId must reject: "${bad}"`);
    assert.ok(res.error);
  }
});

// 6. Non-Restricted Bank Allowlist (Open Provider Invariant)
await check('open-provider-invariant: valid structures with unknown PSP handles are accepted', async () => {
  const openHandles = ['artist@coopbank', 'indie@newfintech', 'dev@anydomain'];
  for (const vpa of openHandles) {
    const res = validateUpiId(vpa);
    assert.equal(res.ok, true, `Must accept open handle VPA "${vpa}"`);
    assert.equal(res.upiId, vpa);
  }
});

// 7. Disabled Configuration Preservation
await check('disabled-state-preservation: disabled tip jar retains previously entered fields', async () => {
  const res = sanitizeTipJarConfig({
    enabled: false,
    upiId: 'saved_artist@upi',
    name: 'Artist Name',
    amount: '100',
    message: 'Thanks!',
  });

  assert.equal(res.ok, true);
  assert.equal(res.config.enabled, false);
  assert.equal(res.config.upiId, 'saved_artist@upi');
  assert.equal(res.config.name, 'Artist Name');
  assert.equal(res.config.amount, '100');
  assert.equal(res.config.message, 'Thanks!');
});

// 8. Name and Message Length Truncation & Trimming
await check('length-limits: trims and bounds name and message lengths', async () => {
  const longName = 'A'.repeat(150);
  const longMsg = 'B'.repeat(300);

  const res = sanitizeTipJarConfig({
    enabled: false,
    name: `  ${longName}  `,
    message: `  ${longMsg}  `,
  });

  assert.equal(res.ok, true);
  assert.equal(res.config.name.length, 100);
  assert.equal(res.config.message.length, 200);
});

// 9. Suggested Amount Normalization
await check('amount-normalization: normalizes valid positive integer and 2-decimal values', async () => {
  const validAmounts = [
    { in: '10', out: '10' },
    { in: '50.5', out: '50.5' },
    { in: '99.99', out: '99.99' },
    { in: 500, out: '500' },
    { in: '', out: '' },
    { in: null, out: '' },
  ];

  for (const item of validAmounts) {
    const res = normalizeTipAmount(item.in);
    assert.equal(res.ok, true, `Should accept amount "${item.in}"`);
    assert.equal(res.amount, item.out);
  }
});

// 10. Invalid Amount Rejection
await check('amount-rejection: refuses zero, negative, malformed, over-precision, and currency symbols', async () => {
  const invalidAmounts = [
    '0',
    '0.00',
    '-50',
    '10.999',
    '₹50',
    '$10',
    '50,00',
    '1e4',
    'fifty',
    '150000', // exceeds max limit (100000)
  ];

  for (const bad of invalidAmounts) {
    const res = normalizeTipAmount(bad);
    assert.equal(res.ok, false, `normalizeTipAmount must reject: "${bad}"`);
    assert.ok(res.error);
  }
});

// 11. Absence of Verification / Webhook Fields (Zero Payment-Success Invariant)
await check('no-payment-success-fields: schema contains no paid/verified/received fields', async () => {
  const sampleDoc = new Page({
    uri: 'v2_invariants',
    owner: 'inv@example.com',
  });

  const schemaKeys = Object.keys(Page.schema.paths);
  const forbiddenKeywords = ['paid', 'paymentsuccess', 'transactionverified', 'received', 'paymentstatus'];
  
  for (const key of schemaKeys) {
    const lower = key.toLowerCase();
    for (const forbidden of forbiddenKeywords) {
      assert.ok(
        !lower.includes(forbidden),
        `Schema path "${key}" must not contain forbidden payment-success keyword "${forbidden}"`
      );
    }
  }
});

// 12. Zero New Dependencies Invariant
await check('zero-dependencies: package.json has no new dependencies added', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('razorpay'), 'No razorpay dependency');
  assert.ok(!deps.includes('stripe'), 'No stripe dependency');
});

console.log('\n================================');
console.log(`Wave 5 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
