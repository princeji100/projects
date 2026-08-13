#!/usr/bin/env node
// Phase 1.5 verification harness. Plain node, no framework.
// Runs unit checks against exports and failure modes.

import assert from 'node:assert/strict';

// Load .env if present
try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // .env is optional for unit checks
}

let failures = 0;
let passed = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}: ${String(err.message).split('\n')[0]}`);
  }
}

async function run() {
  console.log('--- Phase 1.5 Unit Verification ---');

  // 1. Check AdminAction exports and unauthenticated behavior
  const adminActions = await import('../action/AdminAction.js');
  await check('AdminAction exports addAllowedUser', () => {
    assert.equal(typeof adminActions.addAllowedUser, 'function');
  });

  await check('AdminAction exports removeAllowedUser', () => {
    assert.equal(typeof adminActions.removeAllowedUser, 'function');
  });

  await check('addAllowedUser unauthenticated fails with error', async () => {
    const res = await adminActions.addAllowedUser('test@example.com');
    assert.equal(res.success, false);
    assert.match(res.error, /Authentication required|Forbidden|not configured/i);
  });

  await check('removeAllowedUser unauthenticated fails with error', async () => {
    const res = await adminActions.removeAllowedUser('test@example.com');
    assert.equal(res.success, false);
    assert.match(res.error, /Authentication required|Forbidden|not configured/i);
  });

  // 2. Check UploadAction exports and unauthenticated behavior
  const uploadActions = await import('../action/UploadAction.js');
  await check('UploadAction exports deleteUpload', () => {
    assert.equal(typeof uploadActions.deleteUpload, 'function');
  });

  await check('UploadAction exports getUploadReferences', () => {
    assert.equal(typeof uploadActions.getUploadReferences, 'function');
  });

  await check('deleteUpload unauthenticated fails with error', async () => {
    const res = await uploadActions.deleteUpload('fakeid123');
    assert.equal(res.success, false);
    assert.match(res.error, /Authentication required/i);
  });

  await check('getUploadReferences unauthenticated fails with error', async () => {
    const res = await uploadActions.getUploadReferences('fakeid123');
    assert.equal(res.success, false);
    assert.match(res.error, /Authentication required/i);
  });

  console.log(`\nResults: ${passed} passed, ${failures} failed`);
  if (failures > 0) {
    process.exit(1);
  }
}

run();
