#!/usr/bin/env node
// Phase 1 verification harness. Plain node, no framework, no fixtures on disk.
//   node scripts/verify-phase1.js --units    # pure logic, no server, no database
//   node scripts/verify-phase1.js            # everything
// Integration flags SKIP rather than fail when credentials or a server are absent.
//
// Environment read by the integration half (all optional — absence means SKIP):
//   MONGODB_URI               database-state assertions
//   BUCKET_NAME               S3 bucket-state assertions (with lib/s3.js, plan 01-01)
//   VERIFY_BASE_URL           default http://localhost:3000
//   VERIFY_SESSION_COOKIE     next-auth.session-token value from a signed-in browser
//   VERIFY_DENIED_EMAIL       second Google account used for SEC-11's manual half
//   VERIFY_PAGE_URI           existing page uri for SEC-08's success case
//   RATE_LIMIT_WINDOW_MS      injected short window (plan 01-03 honours it)
//   RATE_LIMIT_MAX_OVERRIDE   injected max (plan 01-03 honours it)

import assert from 'node:assert/strict';
import { detectImageType } from '../lib/magicBytes.js';
import { validateUsername } from '../lib/username.js';

// .env is loaded by Next.js in the app, but this script runs bare.
// process.loadEnvFile is stdlib (node 20.6+) — no dotenv dependency.
try {
  process.loadEnvFile(new URL('../.env', import.meta.url).pathname);
} catch {
  // No .env is a valid state: every integration check degrades to SKIP.
}

const FLAGS = [
  '--units', '--sec01', '--sec02', '--sec03', '--sec04',
  '--sec05', '--sec08', '--sec11-db', '--sec12',
];

const requested = process.argv.slice(2).filter((a) => FLAGS.includes(a));
const wants = (flag) => requested.length === 0 || requested.includes(flag);

let failures = 0;
let skipped = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures++;
    // One line per check: assert's multi-line diffs would break the format.
    console.log(`FAIL ${name}: ${String(err.message).split('\n')[0]}`);
  }
}

function skip(name, why) {
  skipped++;
  console.log(`SKIP ${name}: ${why}`);
}

// Fixtures are generated, never read from disk — no committed binaries.
const padTo = (buf, bytes) =>
  Buffer.concat([buf, Buffer.alloc(Math.max(0, bytes - buf.length))]);

const fixtures = {
  png: padTo(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 12),
  jpeg: padTo(Buffer.from([0xff, 0xd8, 0xff]), 12),
  webp: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]),
  riffNotWebp: Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')]),
  svg: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
};

async function runUnits() {
  await check('magicBytes: png', () =>
    assert.deepEqual(detectImageType(fixtures.png), { mime: 'image/png', ext: 'png' }));
  await check('magicBytes: jpeg', () =>
    assert.deepEqual(detectImageType(fixtures.jpeg), { mime: 'image/jpeg', ext: 'jpg' }));
  await check('magicBytes: webp', () =>
    assert.deepEqual(detectImageType(fixtures.webp), { mime: 'image/webp', ext: 'webp' }));
  await check('magicBytes: RIFF without WEBP is not an image', () =>
    assert.equal(detectImageType(fixtures.riffNotWebp), null));
  await check('magicBytes: svg rejected', () =>
    assert.equal(detectImageType(fixtures.svg), null));
  await check('magicBytes: buffer under 12 bytes rejected', () =>
    assert.equal(detectImageType(Buffer.alloc(8)), null));
  await check('magicBytes: gif rejected', () =>
    assert.equal(detectImageType(padTo(Buffer.from('GIF89a'), 12)), null));

  await check('username: 2 chars refused (boundary)', () =>
    assert.equal(validateUsername('ab').ok, false));
  await check('username: 3 chars accepted (boundary)', () =>
    assert.equal(validateUsername('abc').ok, true));
  await check('username: 30 chars accepted (boundary)', () =>
    assert.equal(validateUsername('a'.repeat(30)).ok, true));
  await check('username: 31 chars refused (boundary)', () =>
    assert.equal(validateUsername('a'.repeat(31)).ok, false));
  await check('username: dot refused', () =>
    assert.equal(validateUsername('Bad.Name').ok, false));
  await check('username: space refused', () =>
    assert.equal(validateUsername('has space').ok, false));
  await check('username: emoji refused', () =>
    assert.equal(validateUsername('emoji🎉').ok, false));
  await check('username: valid_name-3 accepted', () =>
    assert.equal(validateUsername('valid_name-3').ok, true));
  await check('username: empty refused', () =>
    assert.equal(validateUsername('').ok, false));

  for (const reserved of ['api', 'login', 'admin', 'root']) {
    await check(`username: '${reserved}' reserved`, () =>
      assert.equal(validateUsername(reserved).ok, false));
  }

  await check('username: every refusal carries an error string', () => {
    for (const bad of ['', 'ab', 'a'.repeat(31), 'Bad.Name', 'has space', 'api']) {
      const result = validateUsername(bad);
      assert.equal(result.ok, false);
      assert.equal(typeof result.error, 'string');
      assert.ok(result.error.length > 0, `empty error for ${JSON.stringify(bad)}`);
    }
  });
}

// ---------------------------------------------------------------------------
// Integration half. Every check below needs something the units do not:
// a running server, a live database, S3 credentials, or a session cookie.
// Each dependency is probed once and turns its checks into SKIP when absent.
// ---------------------------------------------------------------------------

const BASE_URL = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
const COOKIE = process.env.VERIFY_SESSION_COOKIE;
const MB = 1024 * 1024;

const authHeaders = () =>
  COOKIE ? { cookie: `next-auth.session-token=${COOKIE}` } : {};

// Multipart body built by hand: the point of SEC-03 is controlling the part's
// declared Content-Type independently of the bytes, which FormData/Blob makes
// awkward to spoof. filename and contentType are deliberately caller-supplied.
function multipart(buffer, filename, contentType) {
  const boundary = `----verifyphase1${'0'.repeat(8)}`;
  const head = Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return {
    body: Buffer.concat([head, buffer, tail]),
    type: `multipart/form-data; boundary=${boundary}`,
  };
}

async function upload(buffer, { filename = 'x.png', contentType = 'image/png', cookie = true } = {}) {
  const { body, type } = multipart(buffer, filename, contentType);
  return fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'content-type': type, ...(cookie ? authHeaders() : {}) },
    body,
  });
}

async function serverUp() {
  try {
    await fetch(BASE_URL, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

// mongoose is imported lazily so --units never pays for it and never needs a URI.
let mongooseRef = null;
async function db() {
  if (!process.env.MONGODB_URI) return null;
  if (mongooseRef) return mongooseRef.connection.db;
  const { default: mongoose } = await import('mongoose');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  mongooseRef = mongoose;
  return mongoose.connection.db;
}

const countOf = async (database, name) =>
  database.collection(name).countDocuments();

// ponytail: lib/s3.js is created by plan 01-01 (deferred — irreversible wipe).
// Imported dynamically so a missing module is a SKIP, not a module-load crash.
// Do NOT create lib/s3.js here: pre-empting the wipe plan is how buckets get emptied by accident.
async function bucketKeyCount() {
  if (!process.env.BUCKET_NAME) return null;
  try {
    const { s3Client, ListObjectsV2Command } = await import('../lib/s3.js');
    const out = await s3Client.send(
      new ListObjectsV2Command({ Bucket: process.env.BUCKET_NAME })
    );
    return out.KeyCount ?? 0;
  } catch {
    return null;
  }
}

async function runSec01() {
  if (!(await serverUp())) return skip('sec01', `no server at ${BASE_URL}`);
  const before = await bucketKeyCount();

  await check('sec01: POST /api/upload without session → 401', async () => {
    const res = await upload(fixtures.png, { cookie: false });
    assert.equal(res.status, 401);
  });

  if (before === null) {
    skip('sec01 bucket delta', 'no BUCKET_NAME or lib/s3.js (plan 01-01)');
  } else {
    await check('sec01: unauthenticated refusal wrote no S3 object', async () => {
      assert.equal(await bucketKeyCount(), before);
    });
  }

  if (!COOKIE) return skip('sec01 authenticated case', 'no VERIFY_SESSION_COOKIE');
  await check('sec01: POST /api/upload with session → 200', async () => {
    const res = await upload(fixtures.png);
    assert.equal(res.status, 200);
  });
}

async function runSec02() {
  if (!(await serverUp())) return skip('sec02', `no server at ${BASE_URL}`);
  if (!COOKIE) return skip('sec02', 'no VERIFY_SESSION_COOKIE');

  // 4.2 MB is inside Vercel's 4.5 MB platform ceiling, so OUR 4 MB gate is what
  // fires. A >4.5 MB case is deliberately absent: Vercel refuses those before the
  // handler runs, so it would test Vercel, not us.
  await check('sec02: 4.2 MB → 413', async () => {
    const res = await upload(padTo(fixtures.png, 4.2 * MB));
    assert.equal(res.status, 413);
  });

  await check('sec02: 3.9 MB → 200', async () => {
    const res = await upload(padTo(fixtures.png, 3.9 * MB));
    assert.equal(res.status, 200);
  });
}

async function runSec03() {
  if (!(await serverUp())) return skip('sec03', `no server at ${BASE_URL}`);
  if (!COOKIE) return skip('sec03', 'no VERIFY_SESSION_COOKIE');

  await check('sec03: svg → 415', async () => {
    const res = await upload(fixtures.svg, { filename: 'x.svg', contentType: 'image/svg+xml' });
    assert.equal(res.status, 415);
  });

  // The spoofed case: SVG bytes wearing a PNG label. Proves magic bytes are authoritative.
  await check('sec03: svg bytes labelled image/png → 415', async () => {
    const res = await upload(fixtures.svg, { filename: 'x.png', contentType: 'image/png' });
    assert.equal(res.status, 415);
  });

  await check('sec03: RIFF-without-WEBP → 415', async () => {
    const res = await upload(fixtures.riffNotWebp, { filename: 'x.webp', contentType: 'image/webp' });
    assert.equal(res.status, 415);
  });

  for (const [name, ct] of [['png', 'image/png'], ['jpeg', 'image/jpeg'], ['webp', 'image/webp']]) {
    await check(`sec03: real ${name} → 200`, async () => {
      const res = await upload(fixtures[name], { filename: `x.${name}`, contentType: ct });
      assert.equal(res.status, 200);
    });
  }

  // Stored extension must follow the DETECTED type, not the sent filename.
  await check('sec03: png sent as x.jpg is stored with a .png key', async () => {
    const res = await upload(fixtures.png, { filename: 'x.jpg', contentType: 'image/jpeg' });
    assert.equal(res.status, 200);
    const link = await res.json();
    assert.ok(
      String(typeof link === 'string' ? link : link?.url ?? '').endsWith('.png'),
      `stored key should end .png, got ${JSON.stringify(link)}`
    );
  });
}

async function runSec04() {
  const database = await db();
  if (!database) return skip('sec04', 'no MONGODB_URI');
  if (!(await serverUp())) return skip('sec04', `no server at ${BASE_URL}`);
  if (!COOKIE) return skip('sec04', 'no VERIFY_SESSION_COOKIE');

  const QUOTA = 25 * MB;
  const CHUNK = 3.9 * MB;

  await check('sec04: past 25 MB quota is refused, with no S3 object and no uploads row', async () => {
    const sumFor = async () => {
      const [row] = await database.collection('uploads')
        .aggregate([{ $group: { _id: null, total: { $sum: '$size' } } }]).toArray();
      return row?.total ?? 0;
    };

    // Fill to the quota. Bounded so a broken size gate cannot loop forever.
    for (let i = 0; i < 12 && (await sumFor()) < QUOTA; i++) {
      await upload(padTo(fixtures.png, CHUNK));
    }
    assert.ok(await sumFor() >= QUOTA, 'could not reach the 25 MB quota to test past it');

    const keysBefore = await bucketKeyCount();
    const rowsBefore = await countOf(database, 'uploads');
    const res = await upload(padTo(fixtures.png, CHUNK));

    assert.ok(res.status >= 400, `expected a refusal past quota, got ${res.status}`);
    assert.equal(await countOf(database, 'uploads'), rowsBefore, 'a new uploads row was written');
    if (keysBefore !== null) {
      assert.equal(await bucketKeyCount(), keysBefore, 'a new S3 object was written despite the refusal');
    }
  });
}

async function runSec05() {
  const database = await db();
  if (!database) return skip('sec05', 'no MONGODB_URI');

  await check('sec05: ratelimits has a unique index on key', async () => {
    const indexes = await database.collection('ratelimits').indexes();
    const keyIdx = indexes.find((i) => i.key?.key === 1);
    assert.ok(keyIdx, 'no index on { key: 1 }');
    assert.equal(keyIdx.unique, true, 'index on key is not unique');
  });

  await check('sec05: ratelimits has a TTL index on expiresAt', async () => {
    const indexes = await database.collection('ratelimits').indexes();
    const ttl = indexes.find((i) => i.key?.expiresAt === 1);
    assert.ok(ttl, 'no index on { expiresAt: 1 }');
    assert.equal(ttl.expireAfterSeconds, 0, 'expiresAt index is not a 0-second TTL');
  });

  if (!(await serverUp())) return skip('sec05 429 case', `no server at ${BASE_URL}`);
  if (!COOKIE) return skip('sec05 429 case', 'no VERIFY_SESSION_COOKIE');

  await check('sec05: max+1 uploads in the window → 429 with Retry-After', async () => {
    const max = Number(process.env.RATE_LIMIT_MAX_OVERRIDE || 10);
    let last;
    for (let i = 0; i <= max; i++) last = await upload(fixtures.png);
    assert.equal(last.status, 429);
    assert.ok(last.headers.get('Retry-After'), 'no Retry-After header on the 429');
  });
}

async function runSec08() {
  const database = await db();
  if (!database) return skip('sec08', 'no MONGODB_URI');
  if (!(await serverUp())) return skip('sec08', `no server at ${BASE_URL}`);

  const click = (qs) => fetch(`${BASE_URL}/api/click${qs}`, { method: 'POST' });
  const events = () => countOf(database, 'events');

  await check('sec08: failures return 400 and write no events row', async () => {
    const before = await events();

    assert.equal((await click('')).status, 400, 'no params should be 400');
    assert.equal((await click('?url=!!!')).status, 400, 'malformed url should be 400');
    assert.equal(
      (await click(`?url=${btoa('https://example.com')}&page=definitely-not-a-page`)).status,
      400,
      'unknown page should be 400'
    );

    // The missing-param case currently writes a garbage row with HTTP 200,
    // so this count assertion is the part that actually catches the bug.
    assert.equal(await events(), before, 'a failure case wrote an events row');
  });

  const pageUri = process.env.VERIFY_PAGE_URI;
  if (!pageUri) return skip('sec08 success case', 'no VERIFY_PAGE_URI');
  await check('sec08: valid url + existing page → 200 and exactly one new event', async () => {
    const before = await events();
    const res = await click(`?url=${btoa('https://example.com')}&page=${pageUri}`);
    assert.equal(res.status, 200);
    assert.equal(await events(), before + 1, 'expected exactly one new events row');
  });
}

async function runSec11Db() {
  const database = await db();
  if (!database) return skip('sec11-db', 'no MONGODB_URI');

  await check('sec11-db: allowedusers collection exists and is non-empty', async () => {
    const names = (await database.listCollections().toArray()).map((c) => c.name);
    assert.ok(
      names.includes('allowedusers'),
      `no allowedusers collection (have: ${names.join(', ')})`
    );
    assert.ok(await countOf(database, 'allowedusers') > 0, 'allowedusers is empty');
  });

  const denied = process.env.VERIFY_DENIED_EMAIL;
  if (!denied) return skip('sec11-db denied-user case', 'no VERIFY_DENIED_EMAIL');
  await check('sec11-db: denied sign-in created no users row', async () => {
    const found = await database.collection('users').findOne({ email: denied });
    assert.equal(found, null, `users row exists for the denied email ${denied}`);
  });
}

async function runSec12() {
  const database = await db();
  if (!database) return skip('sec12', 'no MONGODB_URI');

  // Only meaningful immediately after plan 01-01's wipe — later plans legitimately create rows.
  await check('sec12: pages, events, accounts, sessions are absent or empty', async () => {
    const names = (await database.listCollections().toArray()).map((c) => c.name);
    for (const name of ['pages', 'events', 'accounts', 'sessions']) {
      if (!names.includes(name)) continue;
      assert.equal(await countOf(database, name), 0, `${name} is not empty`);
    }
  });

  const keys = await bucketKeyCount();
  if (keys === null) {
    skip('sec12 bucket', 'no BUCKET_NAME or lib/s3.js (plan 01-01)');
  } else {
    await check('sec12: bucket returns KeyCount 0', () =>
      assert.equal(keys, 0, `bucket still holds ${keys} object(s)`));
  }
}

async function main() {
  if (wants('--units')) await runUnits();
  if (wants('--sec01')) await runSec01();
  if (wants('--sec02')) await runSec02();
  if (wants('--sec03')) await runSec03();
  if (wants('--sec04')) await runSec04();
  if (wants('--sec05')) await runSec05();
  if (wants('--sec08')) await runSec08();
  if (wants('--sec11-db')) await runSec11Db();
  if (wants('--sec12')) await runSec12();

  if (mongooseRef) await mongooseRef.disconnect();

  console.log(`\n${failures === 0 ? 'OK' : 'FAILED'} — ${failures} failure(s), ${skipped} skipped`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
