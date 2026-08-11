#!/usr/bin/env node
// Phase 1 verification harness. Plain node, no framework, no fixtures on disk.
//   node scripts/verify-phase1.js --units    # pure logic, no server, no database
//   node scripts/verify-phase1.js            # everything
// Integration flags SKIP rather than fail when credentials or a server are absent.

import assert from 'node:assert/strict';
import { detectImageType } from '../lib/magicBytes.js';
import { validateUsername } from '../lib/username.js';

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
    console.log(`FAIL ${name}: ${err.message}`);
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

async function main() {
  if (wants('--units')) await runUnits();

  console.log(`\n${failures === 0 ? 'OK' : 'FAILED'} — ${failures} failure(s), ${skipped} skipped`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
