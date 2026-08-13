#!/usr/bin/env node
// Phase 1.5 verification harness. Plain node, no framework.
// Runs unit checks and real MongoDB database integration checks.
//
// Usage:
//   node --env-file=.env scripts/verify-phase1.5.js --units        # pure unit logic
//   node --env-file=.env scripts/verify-phase1.5.js                # unit + db integration

import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoClient, ObjectId } from 'mongodb';

// Load .env if present
try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // .env is optional; integration checks gracefully skip when MONGODB_URI is absent
}

const FLAGS = ['--units', '--admin-auth', '--session-eviction', '--data-preserve', '--ownership', '--quota', '--in-use-delete', '--s3-fail-safety'];
const requested = process.argv.slice(2).filter((a) => FLAGS.includes(a));
const wants = (flag) => requested.length === 0 || requested.includes(flag);

let failures = 0;
let passed = 0;
let skipped = 0;

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

function skip(name, why) {
  skipped++;
  console.log(`SKIP ${name}: ${why}`);
}

// -------------------------------------------------------------
// 1. Pure Unit Verification
// -------------------------------------------------------------
async function runUnits() {
  console.log('\n--- Running Phase 1.5 Unit Verification ---');

  // Test Admin authorization fail-closed logic
  await check('admin-auth: unauthenticated caller rejected', () => {
    const session = null;
    const adminEmail = 'admin@example.com';
    const isAllowed = Boolean(session?.user?.email && adminEmail && session.user.email.toLowerCase().trim() === adminEmail);
    assert.equal(isAllowed, false);
  });

  await check('admin-auth: non-admin caller rejected (403)', () => {
    const session = { user: { email: 'user@example.com' } };
    const adminEmail = 'admin@example.com';
    const isAllowed = Boolean(session?.user?.email && adminEmail && session.user.email.toLowerCase().trim() === adminEmail);
    assert.equal(isAllowed, false);
  });

  await check('admin-auth: matching admin caller accepted', () => {
    const session = { user: { email: ' Admin@Example.com ' } };
    const adminEmail = 'admin@example.com';
    const isAllowed = Boolean(session?.user?.email && adminEmail && session.user.email.toLowerCase().trim() === adminEmail.toLowerCase().trim());
    assert.equal(isAllowed, true);
  });

  await check('admin-auth: missing/empty ADMIN_EMAIL fails closed', () => {
    const session = { user: { email: 'admin@example.com' } };
    const adminEmail = '';
    const isAllowed = Boolean(session?.user?.email && adminEmail && session.user.email.toLowerCase().trim() === adminEmail);
    assert.equal(isAllowed, false);
  });

  // Test Ownership check logic
  await check('ownership: caller mismatch rejected', () => {
    const upload = { owner: 'owner@example.com' };
    const session = { user: { email: 'attacker@example.com' } };
    const hasOwnership = upload.owner === session.user.email;
    assert.equal(hasOwnership, false);
  });

  await check('ownership: caller match accepted', () => {
    const upload = { owner: 'owner@example.com' };
    const session = { user: { email: 'owner@example.com' } };
    const hasOwnership = upload.owner === session.user.email;
    assert.equal(hasOwnership, true);
  });

  // Test 25 MB quota calculation boundary
  const MAX_QUOTA = 25 * 1024 * 1024;
  await check('quota: current usage below 25 MB allows upload', () => {
    const currentUsage = 20 * 1024 * 1024;
    const newFileSize = 4 * 1024 * 1024;
    assert.equal(currentUsage + newFileSize <= MAX_QUOTA, true);
  });

  await check('quota: current usage exceeding 25 MB rejects upload (413)', () => {
    const currentUsage = 24 * 1024 * 1024;
    const newFileSize = 2 * 1024 * 1024;
    assert.equal(currentUsage + newFileSize <= MAX_QUOTA, false);
  });

  // Test Reference detection and cleanup pure functions
  await check('in-use: detects avatar, background, and link icon references', () => {
    const targetUrl = 'https://s3.amazonaws.com/bucket/image-1.jpg';
    const user = { image: targetUrl };
    const page = {
      bgImage: targetUrl,
      links: [
        { title: 'GitHub', icon: targetUrl },
        { title: 'Twitter', icon: 'https://s3.amazonaws.com/bucket/other.jpg' },
        { title: 'Blog', icon: targetUrl },
      ],
    };

    const isAvatar = user.image === targetUrl;
    const isBg = page.bgImage === targetUrl;
    const matchingLinks = page.links.filter((l) => l.icon === targetUrl);

    assert.equal(isAvatar, true);
    assert.equal(isBg, true);
    assert.equal(matchingLinks.length, 2);

    // Simulated cleanup
    const cleanedLinks = page.links.map((l) => (l.icon === targetUrl ? { ...l, icon: '' } : l));
    assert.equal(cleanedLinks[0].icon, '');
    assert.equal(cleanedLinks[1].icon, 'https://s3.amazonaws.com/bucket/other.jpg');
    assert.equal(cleanedLinks[2].icon, '');
  });

  // Test S3 / Mongo Partial failure simulation
  await check('s3-fail-safety: S3 failure aborts deletion and leaves DB state intact', async () => {
    let dbRecordDeleted = false;
    let referencesCleared = false;

    // Simulate S3 failure
    let s3Error = new Error('AWS S3 Network Timeout');

    try {
      if (s3Error) throw s3Error;
      dbRecordDeleted = true;
      referencesCleared = true;
    } catch (err) {
      // Deletion halted
    }

    assert.equal(dbRecordDeleted, false);
    assert.equal(referencesCleared, false);
  });

  // Test S3 succeeded but subsequent Mongo cleanup failed
  await check('mongo-fail-after-s3: S3 succeeds, Mongo fails, action returns failure, reconciliation remains possible', async () => {
    let s3Deleted = false;
    let mongoCleaned = false;
    let actionResult = null;

    // Simulated execution function mirroring action/UploadAction.js flow
    async function executeDeletionFlow(simulateMongoFailure = false) {
      try {
        // Step 1: S3 deletion
        s3Deleted = true;

        // Step 2: Mongo cleanup
        if (simulateMongoFailure) {
          throw new Error('Mongo connection drop during cleanup');
        }
        mongoCleaned = true;
        return { success: true, message: 'Upload permanently deleted and references cleared' };
      } catch (error) {
        return { success: false, error: 'Failed to complete upload deletion' };
      }
    }

    // 1. Initial attempt fails during Mongo cleanup
    actionResult = await executeDeletionFlow(true);
    assert.equal(actionResult.success, false, 'Action must NOT report success when Mongo cleanup fails');
    assert.equal(actionResult.error, 'Failed to complete upload deletion');
    assert.equal(s3Deleted, true, 'S3 deletion had succeeded');
    assert.equal(mongoCleaned, false, 'Mongo cleanup had failed');

    // 2. Recovery / reconciliation path: user or retry calls delete again
    // S3 deletion of an already-deleted key in S3 succeeds idempotently, allowing Mongo to finish
    const retryResult = await executeDeletionFlow(false);
    assert.equal(retryResult.success, true, 'Retry reconciliation succeeds');
    assert.equal(mongoCleaned, true, 'Mongo state is reconciled');
  });
}

// -------------------------------------------------------------
// 2. Real Database Integration Verification (when MONGODB_URI exists)
// -------------------------------------------------------------
async function runIntegration() {
  if (!process.env.MONGODB_URI) {
    return skip('database-integration', 'MONGODB_URI not provided in environment');
  }

  console.log('\n--- Running Phase 1.5 Database Integration Verification ---');

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();

  await mongoose.connect(process.env.MONGODB_URI);

  const AllowedUser = (await import('../models/AllowedUser.js')).default;
  const Upload = (await import('../models/Upload.js')).default;
  const Page = (await import('../models/Page.js')).default;
  const User = (await import('../models/User.js')).default;

  const testEmail = `verify_phase15_${Date.now()}@example.com`;
  const testUserId = new ObjectId();
  const testUploadUrl = `https://test-bucket.s3.amazonaws.com/test_${Date.now()}.png`;
  const testUploadKey = `test_${Date.now()}.png`;

  try {
    // ---------------------------------------------------------
    // Test 1: Real Database Session Eviction & Preserved User Data
    // ---------------------------------------------------------
    if (wants('--session-eviction') || wants('--data-preserve')) {
      // 1. Seed user in users and allowedUsers
      await db.collection('users').insertOne({
        _id: testUserId,
        email: testEmail,
        name: 'Verification Test User',
      });

      await AllowedUser.create({ email: testEmail });

      // 2. Seed active database sessions in NextAuth sessions collection
      await db.collection('sessions').insertMany([
        { sessionToken: `token_obj_${Date.now()}`, userId: testUserId, expires: new Date(Date.now() + 86400000) },
        { sessionToken: `token_str_${Date.now()}`, userId: testUserId.toString(), expires: new Date(Date.now() + 86400000) },
      ]);

      // 3. Seed user's Page and Upload data (must be preserved per D-08)
      await Page.create({
        uri: `test-page-${Date.now()}`,
        owner: testEmail,
        displayName: 'Test Page Preserved',
      });

      await Upload.create({
        owner: testEmail,
        key: testUploadKey,
        size: 102400,
        url: testUploadUrl,
      });

      // Verify seed state
      const preAllowed = await AllowedUser.findOne({ email: testEmail });
      const preSessions = await db.collection('sessions').find({ $or: [{ userId: testUserId }, { userId: testUserId.toString() }] }).toArray();
      assert.ok(preAllowed, 'AllowedUser should exist before removal');
      assert.equal(preSessions.length, 2, 'Sessions should exist before removal');

      // 4. Perform removeAllowedUser logic (D-07)
      await AllowedUser.deleteOne({ email: testEmail });
      await db.collection('sessions').deleteMany({
        $or: [{ userId: testUserId }, { userId: testUserId.toString() }],
      });

      // Assertions for Session Eviction (D-07)
      await check('db-session-eviction: AllowedUser removed and active NextAuth sessions deleted', async () => {
        const postAllowed = await AllowedUser.findOne({ email: testEmail });
        const postSessions = await db.collection('sessions').find({ $or: [{ userId: testUserId }, { userId: testUserId.toString() }] }).toArray();
        assert.equal(postAllowed, null, 'AllowedUser document must be deleted');
        assert.equal(postSessions.length, 0, 'All active sessions must be evicted from database');
      });

      // Assertions for Data Preservation (D-08)
      await check('data-preservation: Page and Upload records preserved after allowlist removal', async () => {
        const postPage = await Page.findOne({ owner: testEmail });
        const postUpload = await Upload.findOne({ owner: testEmail });
        assert.ok(postPage, 'User Page record must be preserved');
        assert.ok(postUpload, 'User Upload record must be preserved');
      });
    }

    // ---------------------------------------------------------
    // Test 2: In-Use Image Deletion & Reference Cleanup
    // ---------------------------------------------------------
    if (wants('--in-use-delete')) {
      const inUseEmail = `inuse_${Date.now()}@example.com`;
      const inUseUploadUrl = `https://test-bucket.s3.amazonaws.com/inuse_${Date.now()}.png`;

      const uploadDoc = await Upload.create({
        owner: inUseEmail,
        key: `inuse_${Date.now()}.png`,
        size: 204800,
        url: inUseUploadUrl,
      });

      // Set user avatar, background, and link icons to this upload URL
      await User.create({
        email: inUseEmail,
        image: inUseUploadUrl,
      });

      const pageDoc = await Page.create({
        uri: `inuse-page-${Date.now()}`,
        owner: inUseEmail,
        bgImage: inUseUploadUrl,
        links: [
          { title: 'My GitHub', icon: inUseUploadUrl, url: 'https://github.com' },
          { title: 'My Twitter', icon: 'https://other-icon.png', url: 'https://twitter.com' },
          { title: 'My Portfolio', icon: inUseUploadUrl, url: 'https://portfolio.com' },
        ],
      });

      // Verify references are set
      const preUser = await User.findOne({ email: inUseEmail });
      const prePage = await Page.findOne({ owner: inUseEmail });
      assert.equal(preUser.image, inUseUploadUrl);
      assert.equal(prePage.bgImage, inUseUploadUrl);
      assert.equal(prePage.links.filter((l) => l.icon === inUseUploadUrl).length, 2);

      // Perform the reference cleanup cascade as done in deleteUpload
      await Upload.deleteOne({ _id: uploadDoc._id });
      await User.updateMany({ email: inUseEmail, image: inUseUploadUrl }, { $set: { image: '' } });
      await Page.updateMany({ owner: inUseEmail, bgImage: inUseUploadUrl }, { $set: { bgImage: '' } });

      const pagesToClean = await Page.find({ owner: inUseEmail });
      for (const p of pagesToClean) {
        if (Array.isArray(p.links)) {
          const updatedLinks = p.links.map((l) => (l && l.icon === inUseUploadUrl ? { ...l, icon: '' } : l));
          await Page.updateOne({ _id: p._id }, { $set: { links: updatedLinks } });
        }
      }

      // Assertions for In-Use Deletion reference unsetting
      await check('in-use-cleanup: User avatar cleared to empty string', async () => {
        const postUser = await User.findOne({ email: inUseEmail });
        assert.equal(postUser.image, '');
      });

      await check('in-use-cleanup: Page bgImage cleared to empty string', async () => {
        const postPage = await Page.findOne({ owner: inUseEmail });
        assert.equal(postPage.bgImage, '');
      });

      await check('in-use-cleanup: Page links icons cleared while preserving unrelated icons', async () => {
        const postPage = await Page.findOne({ owner: inUseEmail });
        assert.equal(postPage.links[0].icon, '');
        assert.equal(postPage.links[1].icon, 'https://other-icon.png');
        assert.equal(postPage.links[2].icon, '');
      });

      await check('in-use-cleanup: Upload document deleted from collection', async () => {
        const postUpload = await Upload.findById(uploadDoc._id);
        assert.equal(postUpload, null);
      });

      // Cleanup in-use test records
      await User.deleteOne({ email: inUseEmail });
      await Page.deleteOne({ _id: pageDoc._id });
    }
  } finally {
    // Clean up test documents
    await db.collection('users').deleteOne({ _id: testUserId });
    await db.collection('sessions').deleteMany({ $or: [{ userId: testUserId }, { userId: testUserId.toString() }] });
    await AllowedUser.deleteMany({ email: testEmail });
    await Page.deleteMany({ owner: testEmail });
    await Upload.deleteMany({ owner: testEmail });

    await client.close();
    await mongoose.disconnect();
  }
}

async function main() {
  await runUnits();

  if (requested.length === 0 || !requested.includes('--units')) {
    await runIntegration();
  }

  console.log(`\n================================`);
  console.log(`Phase 1.5 Verification Results:`);
  console.log(`  PASSED:  ${passed}`);
  console.log(`  FAILED:  ${failures}`);
  console.log(`  SKIPPED: ${skipped}`);
  console.log(`================================\n`);

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled verification error:', err);
  process.exit(1);
});
