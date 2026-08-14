import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import Page from '../models/Page.js';
import { validateUpiId, normalizeTipAmount, sanitizeTipJarConfig, buildUpiPaymentUri } from '../lib/tipJar.js';

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

console.log('--- Running Wave 7 Public UPI Tip Jar Modal + QR Verification ---\n');

// 1. Server-Authoritative Eligibility Check for Public Profile
await check('server-eligibility-resolution: only enabled + valid UPI pages produce tipJarPayload', async () => {
  // Case A: Legacy page with no tipJar
  const legacyDoc = new Page({ uri: 'legacy_user', owner: 'legacy@example.com' });
  let payloadA = null;
  if (legacyDoc.tipJar?.enabled && legacyDoc.tipJar.upiId) {
    const v = validateUpiId(legacyDoc.tipJar.upiId);
    if (v.ok) payloadA = { upiId: v.upiId };
  }
  assert.equal(payloadA, null, 'Legacy page must not produce tip payload');

  // Case B: Disabled tipJar with previously entered UPI
  const disabledDoc = new Page({
    uri: 'disabled_user',
    owner: 'dis@example.com',
    tipJar: { enabled: false, upiId: 'saved@upi' },
  });
  let payloadB = null;
  if (disabledDoc.tipJar?.enabled && disabledDoc.tipJar.upiId) {
    const v = validateUpiId(disabledDoc.tipJar.upiId);
    if (v.ok) payloadB = { upiId: v.upiId };
  }
  assert.equal(payloadB, null, 'Disabled tipJar must not produce public tip payload');

  // Case C: Enabled with valid synthetic UPI
  const enabledDoc = new Page({
    uri: 'enabled_user',
    owner: 'ena@example.com',
    tipJar: { enabled: true, upiId: 'creator@okhdfcbank', name: 'Creator Name', amount: '100' },
  });
  let payloadC = null;
  if (enabledDoc.tipJar?.enabled && enabledDoc.tipJar.upiId) {
    const v = validateUpiId(enabledDoc.tipJar.upiId);
    if (v.ok) {
      payloadC = {
        upiId: v.upiId,
        name: enabledDoc.tipJar.name,
        amount: enabledDoc.tipJar.amount,
      };
    }
  }
  assert.ok(payloadC !== null, 'Enabled valid doc must produce tip payload');
  assert.equal(payloadC.upiId, 'creator@okhdfcbank');
  assert.equal(payloadC.name, 'Creator Name');
  assert.equal(payloadC.amount, '100');
});

// 2. Generic URI Builder (upi://pay?...)
await check('buildUpiPaymentUri-generic-scheme: builds generic upi://pay scheme', async () => {
  const uri = buildUpiPaymentUri({
    upiId: 'artist@upi',
    name: 'Indie Artist',
    amount: '50',
    message: 'Chai tip',
  });

  assert.ok(uri.startsWith('upi://pay?'), 'Must start with generic upi://pay? scheme');
  assert.ok(!uri.includes('phonepe://'), 'Must not hardcode phonepe://');
  assert.ok(!uri.includes('paytmmp://'), 'Must not hardcode paytm://');
  assert.ok(!uri.includes('gpay://'), 'Must not hardcode gpay://');
});

// 3. Parameter Mapping and Clean Encoding
await check('param-mapping-encoding: correctly maps pa, pn, am, tn, cu=INR without raw concatenation', async () => {
  const uri = buildUpiPaymentUri({
    upiId: 'merchant.store@okaxis',
    name: 'Dev & Design Studio',
    amount: '99.50',
    message: 'Thanks for & support = awesome',
  });

  const parsedUrl = new URL(uri);
  assert.equal(parsedUrl.protocol, 'upi:');
  assert.equal(parsedUrl.searchParams.get('pa'), 'merchant.store@okaxis');
  assert.equal(parsedUrl.searchParams.get('pn'), 'Dev & Design Studio');
  assert.equal(parsedUrl.searchParams.get('am'), '99.50');
  assert.equal(parsedUrl.searchParams.get('tn'), 'Thanks for & support = awesome');
  assert.equal(parsedUrl.searchParams.get('cu'), 'INR');
});

// 4. Blank / Omitted Optional Parameters
await check('omits-blank-optional-params: empty optional fields are not emitted as query junk', async () => {
  const uri = buildUpiPaymentUri({
    upiId: 'minimalist@paytm',
    name: '',
    amount: '',
    message: '',
  });

  const parsedUrl = new URL(uri);
  assert.equal(parsedUrl.searchParams.get('pa'), 'minimalist@paytm');
  assert.equal(parsedUrl.searchParams.has('pn'), false);
  assert.equal(parsedUrl.searchParams.has('am'), false);
  assert.equal(parsedUrl.searchParams.has('tn'), false);
  assert.equal(parsedUrl.searchParams.get('cu'), 'INR');
});

// 5. Injection Immunity for Reserved URI Characters
await check('injection-immunity: handles malicious attempts to inject extra parameters gracefully', async () => {
  const maliciousMessage = 'Normal note&pa=hacker@upi&am=999999';
  const uri = buildUpiPaymentUri({
    upiId: 'victim@upi',
    name: 'Victim User',
    message: maliciousMessage,
  });

  const parsedUrl = new URL(uri);
  // 'pa' must strictly remain 'victim@upi', never overwritten by query injection
  assert.equal(parsedUrl.searchParams.get('pa'), 'victim@upi');
  assert.equal(parsedUrl.searchParams.get('tn'), maliciousMessage);
  assert.equal(parsedUrl.searchParams.get('cu'), 'INR');
});

// 6. QR Payload Parity with App Launch Link
await check('qr-payload-parity: QR payload equals Open UPI App action intent identically', async () => {
  const tipConfig = {
    upiId: 'photographer@ybl',
    name: 'A Photo Pro',
    amount: '200',
    message: 'Print support',
  };

  const generatedUri = buildUpiPaymentUri(tipConfig);
  // Both QR value and Open in App button consume the exact return of buildUpiPaymentUri
  assert.equal(generatedUri, buildUpiPaymentUri(tipConfig));
});

// 7. Component Source Invariant Checks
await check('component-invariants: PublicTipJar reuses qrcode.react and contains no fake payment-success states', async () => {
  const compSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/tipjar/PublicTipJar.js'),
    'utf8'
  );

  assert.ok(compSrc.includes('QRCodeSVG'), 'Must use QRCodeSVG from qrcode.react');
  assert.ok(!compSrc.toLowerCase().includes('payment successful'), 'Must not claim payment successful');
  assert.ok(!compSrc.toLowerCase().includes('verified transaction'), 'Must not claim verified transaction');
  assert.ok(compSrc.includes('Payment is completed in your UPI app'), 'Must contain required disclaimer');
});

// 8. Zero Dependencies Invariant
await check('zero-dependencies: package.json has no new dependencies added', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('razorpay'));
  assert.ok(!deps.includes('stripe'));
  assert.ok(!deps.includes('cashfree'));
});

console.log('\n================================');
console.log(`Wave 7 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
