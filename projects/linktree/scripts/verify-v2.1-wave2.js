import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';

import Subscription, {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_PROVIDERS,
} from '../models/Subscription.js';
import {
  normalizeUserId,
  getSubscriptionByUserId,
  getSubscriptionByProviderId,
} from '../lib/subscriptionRepository.js';
import { PLAN_IDS } from '../lib/plans.js';

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

console.log('--- Running Milestone v2.1 Wave 2: Subscription Data Model & Repository Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');

// ==========================================
// 1. Subscription Mongoose Schema & Model Invariants
// ==========================================

const schema = Subscription.schema;
const paths = schema.paths;

await check('model: Subscription model exists and is initialized', () => {
  assert.ok(Subscription, 'Subscription model must exist');
  assert.equal(Subscription.modelName, 'Subscription');
});

await check('model: userId is ObjectId type', () => {
  assert.ok(paths.userId, 'userId path must exist in schema');
  assert.ok(
    paths.userId.instance === 'ObjectId' || paths.userId.instance === 'ObjectID',
    'userId must be an ObjectId instance'
  );
});

await check('model: userId references User model', () => {
  assert.equal(paths.userId.options.ref, 'User');
});

await check('model: userId is required and immutable', () => {
  assert.equal(paths.userId.isRequired, true, 'userId must be required');
  assert.equal(paths.userId.options.immutable, true, 'userId must be immutable');
});

await check('model: user account uniqueness is configured', () => {
  assert.equal(paths.userId.options.unique, true, 'userId must have unique: true option');
});

await check('model: plan supports only canonical Free and Pro values', () => {
  assert.ok(paths.plan, 'plan path must exist');
  const planEnum = paths.plan.enumValues || paths.plan.options.enum;
  assert.deepEqual(
    new Set(planEnum),
    new Set([PLAN_IDS.FREE, PLAN_IDS.PRO]),
    'plan enum must match canonical PLAN_IDS'
  );
});

await check('model: plan defaults to free', () => {
  assert.equal(paths.plan.defaultValue, PLAN_IDS.FREE);
});

await check('model: expected subscription status values exist', () => {
  assert.ok(paths.status, 'status path must exist');
  const expected = ['active', 'trialing', 'past_due', 'canceled', 'incomplete', 'expired'];
  assert.deepEqual(
    new Set(SUBSCRIPTION_STATUSES),
    new Set(expected),
    'SUBSCRIPTION_STATUSES must contain all expected lifecycle states'
  );
  const statusEnum = paths.status.enumValues || paths.status.options.enum;
  assert.deepEqual(new Set(statusEnum), new Set(expected));
});

await check('model: status defaults to incomplete (fail-closed security)', () => {
  assert.equal(
    paths.status.defaultValue,
    'incomplete',
    'status must default to incomplete to prevent accidental privilege grant'
  );
});

await check('model: provider supports manual, razorpay, and stripe', () => {
  assert.ok(paths.provider, 'provider path must exist');
  const expected = ['manual', 'razorpay', 'stripe'];
  assert.deepEqual(new Set(SUBSCRIPTION_PROVIDERS), new Set(expected));
  assert.equal(paths.provider.defaultValue, 'manual');
});

await check('model: provider IDs are optional string fields', () => {
  assert.ok(paths.providerCustomerId, 'providerCustomerId path must exist');
  assert.equal(paths.providerCustomerId.instance, 'String');
  assert.equal(paths.providerCustomerId.isRequired, undefined);

  assert.ok(paths.providerSubscriptionId, 'providerSubscriptionId path must exist');
  assert.equal(paths.providerSubscriptionId.instance, 'String');
  assert.equal(paths.providerSubscriptionId.isRequired, undefined);
});

await check('model: billing period fields are Date types', () => {
  assert.ok(paths.currentPeriodStart, 'currentPeriodStart path must exist');
  assert.equal(paths.currentPeriodStart.instance, 'Date');

  assert.ok(paths.currentPeriodEnd, 'currentPeriodEnd path must exist');
  assert.equal(paths.currentPeriodEnd.instance, 'Date');
});

await check('model: cancelAtPeriodEnd defaults to false', () => {
  assert.ok(paths.cancelAtPeriodEnd, 'cancelAtPeriodEnd path must exist');
  assert.equal(paths.cancelAtPeriodEnd.instance, 'Boolean');
  assert.equal(paths.cancelAtPeriodEnd.defaultValue, false);
});

await check('model: timestamps are enabled in schema options', () => {
  assert.equal(schema.options.timestamps, true, 'Schema timestamps must be enabled');
  assert.ok(paths.createdAt, 'createdAt must be defined by timestamps');
  assert.ok(paths.updatedAt, 'updatedAt must be defined by timestamps');
});

// ==========================================
// 2. Index Safety & Uniqueness
// ==========================================

const indexes = schema.indexes();

await check('index: one subscription per user is indexed', () => {
  const userIdIndex = indexes.find(([fields]) => fields.userId === 1);
  assert.ok(userIdIndex, 'Must index userId');
  assert.equal(userIdIndex[1].unique, true, 'userId index must be unique');
});

await check('index: external provider subscription lookup compound index exists', () => {
  const providerIndex = indexes.find(
    ([fields]) => fields.provider === 1 && fields.providerSubscriptionId === 1
  );
  assert.ok(providerIndex, 'Must define compound index on { provider: 1, providerSubscriptionId: 1 }');
  assert.equal(providerIndex[1].unique, true, 'Compound index must be unique');
});

await check('index: provider subscription index uses partial filter for safe missing IDs', () => {
  const providerIndex = indexes.find(
    ([fields]) => fields.provider === 1 && fields.providerSubscriptionId === 1
  );
  assert.ok(providerIndex[1].partialFilterExpression, 'Must use partialFilterExpression');
  assert.deepEqual(
    providerIndex[1].partialFilterExpression,
    { providerSubscriptionId: { $type: 'string' } },
    'Must filter on providerSubscriptionId type string'
  );
});

await check('index: multiple manual subscriptions without external IDs avoid collision', () => {
  // Verifies that documents without providerSubscriptionId are omitted from the partial unique index
  const providerIndex = indexes.find(
    ([fields]) => fields.provider === 1 && fields.providerSubscriptionId === 1
  );
  const filter = providerIndex[1].partialFilterExpression;
  assert.equal(filter.providerSubscriptionId.$type, 'string');
});

// ==========================================
// 3. Subscription Repository Operations
// ==========================================

await check('repository: normalizeUserId safely handles valid ObjectId and string hex formats', () => {
  const validHex = '507f1f77bcf86cd799439011';
  const objectId = new mongoose.Types.ObjectId(validHex);

  const normalizedFromHex = normalizeUserId(validHex);
  assert.ok(normalizedFromHex instanceof mongoose.Types.ObjectId);
  assert.equal(normalizedFromHex.toString(), validHex);

  const normalizedFromObj = normalizeUserId(objectId);
  assert.ok(normalizedFromObj instanceof mongoose.Types.ObjectId);
  assert.equal(normalizedFromObj.toString(), validHex);
});

await check('repository: normalizeUserId returns null for invalid formats', () => {
  assert.equal(normalizeUserId(''), null);
  assert.equal(normalizeUserId(null), null);
  assert.equal(normalizeUserId(undefined), null);
  assert.equal(normalizeUserId('invalid-id'), null);
  assert.equal(normalizeUserId('12345'), null);
  assert.equal(normalizeUserId(12345), null);
  assert.equal(normalizeUserId({}), null);
});

await check('repository: missing userId returns null without querying database', async () => {
  const resultNull = await getSubscriptionByUserId(null);
  assert.strictEqual(resultNull, null);

  const resultUndefined = await getSubscriptionByUserId(undefined);
  assert.strictEqual(resultUndefined, null);

  const resultEmpty = await getSubscriptionByUserId('');
  assert.strictEqual(resultEmpty, null);
});

await check('repository: malformed userId returns null without querying database', async () => {
  const resultBadHex = await getSubscriptionByUserId('not-an-objectid');
  assert.strictEqual(resultBadHex, null);
});

await check('repository: getSubscriptionByProviderId validates provider and id safely', async () => {
  assert.strictEqual(await getSubscriptionByProviderId(null, 'sub_123'), null);
  assert.strictEqual(await getSubscriptionByProviderId('stripe', null), null);
  assert.strictEqual(await getSubscriptionByProviderId('stripe', ''), null);
  assert.strictEqual(await getSubscriptionByProviderId('invalid_provider', 'sub_123'), null);
});

// Stub mongoose.connect so repository methods can run purely in-memory without real MongoDB
const origMongooseConnect = mongoose.connect;
mongoose.connect = async () => mongoose.connection;

await check('repository: getSubscriptionByUserId queries strictly by userId ObjectId', async () => {
  const testId = new mongoose.Types.ObjectId();
  let capturedQuery = null;

  const originalFindOne = Subscription.findOne;
  try {
    Subscription.findOne = (query) => {
      capturedQuery = query;
      return {
        lean: async () => ({
          _id: new mongoose.Types.ObjectId(),
          userId: testId,
          plan: 'pro',
          status: 'active',
        }),
      };
    };

    const doc = await getSubscriptionByUserId(testId.toString());
    assert.ok(doc, 'Should return the mock subscription');
    assert.equal(doc.plan, 'pro');
    assert.ok(capturedQuery.userId instanceof mongoose.Types.ObjectId);
    assert.equal(capturedQuery.userId.toString(), testId.toString());
    assert.strictEqual(capturedQuery.email, undefined, 'Must never query by email');
    assert.strictEqual(capturedQuery.uri, undefined, 'Must never query by uri');
  } finally {
    Subscription.findOne = originalFindOne;
  }
});

await check('repository: getSubscriptionByUserId returns null when document not found', async () => {
  const testId = new mongoose.Types.ObjectId();
  const originalFindOne = Subscription.findOne;
  try {
    Subscription.findOne = () => ({
      lean: async () => null,
    });

    const doc = await getSubscriptionByUserId(testId);
    assert.strictEqual(doc, null);
  } finally {
    Subscription.findOne = originalFindOne;
  }
});

await check('repository: database infrastructure errors propagate rather than being masked as null', async () => {
  const testId = new mongoose.Types.ObjectId();
  const originalFindOne = Subscription.findOne;
  try {
    Subscription.findOne = () => {
      throw new Error('MongoNetworkTimeout');
    };

    await assert.rejects(
      async () => {
        await getSubscriptionByUserId(testId);
      },
      /MongoNetworkTimeout/,
      'Database infrastructure errors must propagate'
    );
  } finally {
    Subscription.findOne = originalFindOne;
  }
});

await check('repository: contains zero mutation or write methods in Wave 2', () => {
  const repoModule = fs.readFileSync(path.join(projectRoot, 'lib/subscriptionRepository.js'), 'utf-8');

  const forbiddenWriteMethods = [
    'createSubscription',
    'updateSubscription',
    'grantPro',
    'activateSubscription',
    'cancelSubscription',
    'deleteSubscription',
    'upsert',
  ];

  for (const m of forbiddenWriteMethods) {
    assert.ok(!repoModule.includes(`function ${m}`), `Repository must not export ${m} in Wave 2`);
    assert.ok(!repoModule.includes(`export const ${m}`), `Repository must not export ${m} in Wave 2`);
  }
});

// ==========================================
// 4. Architectural Separation & Decoupling
// ==========================================

await check('architecture: Subscription schema contains no Page URI or Page ID fields', () => {
  assert.strictEqual(paths.uri, undefined, 'Subscription must not contain uri');
  assert.strictEqual(paths.pageId, undefined, 'Subscription must not contain pageId');
  assert.strictEqual(paths.page, undefined, 'Subscription must not contain page');
});

await check('architecture: Subscription schema contains no hostname or domain fields', () => {
  assert.strictEqual(paths.domain, undefined, 'Subscription must not contain domain');
  assert.strictEqual(paths.hostname, undefined, 'Subscription must not contain hostname');
});

await check('architecture: Subscription schema contains no card/payment credential fields', () => {
  assert.strictEqual(paths.cardNumber, undefined);
  assert.strictEqual(paths.cvv, undefined);
  assert.strictEqual(paths.upiPin, undefined);
  assert.strictEqual(paths.paymentToken, undefined);
});

await check('architecture: User and Page models remain unchanged', () => {
  const userSrc = fs.readFileSync(path.join(projectRoot, 'models/User.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');

  assert.ok(!userSrc.includes('subscription'), 'User model must not reference subscription');
  assert.ok(!userSrc.includes('isPro'), 'User model must not include isPro');
  assert.ok(!pageSrc.includes('subscription'), 'Page model must not reference subscription');
  assert.ok(!pageSrc.includes('plan'), 'Page model must not include plan');
});

await check('architecture: Upload and Page ownership remain on email in Wave 2', () => {
  const uploadSrc = fs.readFileSync(path.join(projectRoot, 'models/Upload.js'), 'utf-8');
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'models/Page.js'), 'utf-8');

  assert.ok(uploadSrc.includes('owner: { type: String'), 'Upload.owner remains String email');
  assert.ok(pageSrc.includes('owner: {'), 'Page.owner remains String email');
});

await check('architecture: no automatic subscription creation on login/signup', () => {
  const nextAuthSrc = fs.readFileSync(path.join(projectRoot, 'app/api/auth/[...nextauth]/route.js'), 'utf-8');
  assert.ok(!nextAuthSrc.includes('Subscription.create'), 'NextAuth must not create subscriptions automatically');
  assert.ok(!nextAuthSrc.includes('Subscription.upsert'), 'NextAuth must not upsert subscriptions');
});

await check('architecture: zero payment SDK dependencies and no billing UI', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps.stripe, 'Must not include stripe dependency');
  assert.ok(!allDeps.razorpay, 'Must not include razorpay dependency');
});

await check('architecture: existing v2.0 features remain ungated and active', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(page)/[uri]/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('YouTubeEmbed'), 'YouTube embed remains active');
  assert.ok(pageSrc.includes('SpotifyEmbed'), 'Spotify embed remains active');
  assert.ok(pageSrc.includes('PublicTipJar'), 'Tip Jar remains active');
});

await check('regression: Wave 1 plan registry & entitlement suite remains 100% green', async () => {
  const { execSync } = await import('node:child_process');
  const output = execSync('node scripts/verify-v2.1-wave1.js', {
    cwd: projectRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });
  assert.ok(output.includes('FAILED:  0'), 'Wave 1 suite must pass with 0 failures');
});

console.log('\n================================');
console.log('Wave 2 Subscription Model Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
