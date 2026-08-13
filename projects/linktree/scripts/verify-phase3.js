import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Page from '../models/Page.js';
import {
  getLinkLifecycleStatus,
  isLinkLive,
  validateAndSanitizeLink,
  toLocalDatetimeInput,
  fromLocalDatetimeInput,
} from '../lib/linkLifecycle.js';

let passed = 0;
let failed = 0;
let skipped = 0;

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

console.log('--- Running Phase 3 Link Lifecycle Verification (Refined) ---\n');

const now = new Date('2026-08-14T12:00:00.000Z');
const pastDate = new Date('2026-08-14T10:00:00.000Z');
const futureDate = new Date('2026-08-14T14:00:00.000Z');
const farFutureDate = new Date('2026-08-14T18:00:00.000Z');

// 1. Schema Definition & Mongoose Subdocument Casting
await check('schema-persistence: LinkSchema defines active, startsAt, and endsAt with defaults', async () => {
  const pageDoc = new Page({
    uri: 'schematest',
    owner: 'test@example.com',
    links: [
      { title: 'Legacy Link', url: 'https://legacy.com' },
      {
        title: 'Scheduled Link',
        url: 'https://sched.com',
        active: false,
        startsAt: '2026-08-14T10:00:00.000Z',
        endsAt: '2026-08-14T14:00:00.000Z',
      },
    ],
  });

  // Legacy link without fields receives Mongoose defaults
  const legacyLink = pageDoc.links[0];
  assert.equal(legacyLink.active, true, 'Legacy link defaults to active: true');
  assert.equal(legacyLink.startsAt, null, 'Legacy link defaults to startsAt: null');
  assert.equal(legacyLink.endsAt, null, 'Legacy link defaults to endsAt: null');

  // Explicitly configured link persists proper BSON types
  const schedLink = pageDoc.links[1];
  assert.equal(schedLink.active, false);
  assert.ok(schedLink.startsAt instanceof Date, 'startsAt is cast to Date instance');
  assert.ok(schedLink.endsAt instanceof Date, 'endsAt is cast to Date instance');
  assert.equal(schedLink.startsAt.toISOString(), '2026-08-14T10:00:00.000Z');
  assert.equal(schedLink.endsAt.toISOString(), '2026-08-14T14:00:00.000Z');
});

// 2. Local datetime-local ↔ UTC Date UI boundary conversion & empty handling
await check('datetime-local-boundary: converts local input strings to UTC Dates, treating empty as null', async () => {
  // Empty values treat as unconstrained
  assert.equal(fromLocalDatetimeInput(''), null);
  assert.equal(fromLocalDatetimeInput('   '), null);
  assert.equal(fromLocalDatetimeInput(null), null);
  assert.equal(fromLocalDatetimeInput(undefined), null);

  // Formatting null / invalid dates to input string returns empty string
  assert.equal(toLocalDatetimeInput(null), '');
  assert.equal(toLocalDatetimeInput(''), '');
  assert.equal(toLocalDatetimeInput('invalid-date'), '');

  // Round-tripping a local datetime
  const inputStr = '2026-08-14T15:45';
  const convertedDate = fromLocalDatetimeInput(inputStr);
  assert.ok(convertedDate instanceof Date);
  const formattedBack = toLocalDatetimeInput(convertedDate);
  assert.equal(formattedBack, inputStr, 'datetime-local input round-trips correctly');
});

// 3. Clear Schedule Simulation
await check('clear-schedule-state: resetting dates clears schedule while preserving active state', async () => {
  let link = {
    title: 'Scheduled Promo',
    url: 'https://promo.com',
    active: true,
    startsAt: futureDate,
    endsAt: farFutureDate,
  };

  assert.equal(getLinkLifecycleStatus(link, now), 'scheduled');

  // Simulate Clear Schedule action
  link = { ...link, startsAt: null, endsAt: null };
  assert.equal(link.startsAt, null);
  assert.equal(link.endsAt, null);
  assert.equal(getLinkLifecycleStatus(link, now), 'live', 'Cleared schedule transitions to live');
  assert.equal(isLinkLive(link, now), true);
});

// 4. Exact Boundary Behavior
await check('exact-boundaries: verifies behavior exactly at, before, and after boundary milliseconds', async () => {
  const boundaryStart = new Date('2026-08-14T12:00:00.000Z');
  const boundaryEnd = new Date('2026-08-14T13:00:00.000Z');

  const link = {
    active: true,
    startsAt: boundaryStart,
    endsAt: boundaryEnd,
  };

  // 1ms before start -> Scheduled (not live)
  const justBeforeStart = new Date(boundaryStart.getTime() - 1);
  assert.equal(getLinkLifecycleStatus(link, justBeforeStart), 'scheduled');
  assert.equal(isLinkLive(link, justBeforeStart), false);

  // Exactly at start timestamp -> Live
  assert.equal(getLinkLifecycleStatus(link, boundaryStart), 'live');
  assert.equal(isLinkLive(link, boundaryStart), true);

  // 1ms before end -> Live
  const justBeforeEnd = new Date(boundaryEnd.getTime() - 1);
  assert.equal(getLinkLifecycleStatus(link, justBeforeEnd), 'live');
  assert.equal(isLinkLive(link, justBeforeEnd), true);

  // Exactly at end timestamp -> Expired (not live)
  assert.equal(getLinkLifecycleStatus(link, boundaryEnd), 'expired');
  assert.equal(isLinkLive(link, boundaryEnd), false);

  // 1ms after end -> Expired
  const justAfterEnd = new Date(boundaryEnd.getTime() + 1);
  assert.equal(getLinkLifecycleStatus(link, justAfterEnd), 'expired');
  assert.equal(isLinkLive(link, justAfterEnd), false);
});

// 5. Inactive Precedence
await check('link-lifecycle-inactive-precedence: active === false is inactive regardless of schedule', async () => {
  const linkInactive = {
    title: 'Inactive Link',
    url: 'https://example.com',
    active: false,
    startsAt: pastDate,
    endsAt: futureDate,
  };
  assert.equal(getLinkLifecycleStatus(linkInactive, now), 'inactive');
  assert.equal(isLinkLive(linkInactive, now), false);

  const linkInactiveScheduled = {
    title: 'Inactive Scheduled',
    url: 'https://example.com',
    active: false,
    startsAt: futureDate,
  };
  assert.equal(getLinkLifecycleStatus(linkInactiveScheduled, now), 'inactive');
  assert.equal(isLinkLive(linkInactiveScheduled, now), false);
});

// 6. Start-only and End-only Schedules
await check('link-lifecycle-partial-schedules: handles start-only and end-only schedules', async () => {
  // Start-only past -> live
  const startOnlyPast = { active: true, startsAt: pastDate };
  assert.equal(getLinkLifecycleStatus(startOnlyPast, now), 'live');
  assert.equal(isLinkLive(startOnlyPast, now), true);

  // Start-only future -> scheduled
  const startOnlyFuture = { active: true, startsAt: futureDate };
  assert.equal(getLinkLifecycleStatus(startOnlyFuture, now), 'scheduled');
  assert.equal(isLinkLive(startOnlyFuture, now), false);

  // End-only future -> live
  const endOnlyFuture = { active: true, endsAt: futureDate };
  assert.equal(getLinkLifecycleStatus(endOnlyFuture, now), 'live');
  assert.equal(isLinkLive(endOnlyFuture, now), true);

  // End-only past -> expired
  const endOnlyPast = { active: true, endsAt: pastDate };
  assert.equal(getLinkLifecycleStatus(endOnlyPast, now), 'expired');
  assert.equal(isLinkLive(endOnlyPast, now), false);
});

// 7. Legacy Backward Compatibility (LINK-04)
await check('link-lifecycle-legacy-compatibility: links without lifecycle fields default to live', async () => {
  const legacyLink = {
    title: 'Old Link',
    subtitle: 'From before Phase 3',
    url: 'https://legacy.com',
    icon: 'https://s3.aws.com/icon.png',
  };

  assert.equal(getLinkLifecycleStatus(legacyLink, now), 'live');
  assert.equal(isLinkLive(legacyLink, now), true);
});

// 8. Server validation: invalid date range endsAt <= startsAt rejected
await check('link-validation-range: endsAt <= startsAt is rejected with clear error', async () => {
  const invalidRange = {
    title: 'Broken Dates',
    url: 'https://example.com',
    startsAt: '2026-08-14T14:00:00.000Z',
    endsAt: '2026-08-14T10:00:00.000Z',
  };

  const validation = validateAndSanitizeLink(invalidRange);
  assert.equal(validation.ok, false);
  assert.match(validation.error, /expiration time must be after start time/i);
});

// 9. Server validation: malformed timestamp strings rejected
await check('link-validation-malformed-dates: invalid timestamp strings rejected', async () => {
  const badStart = {
    title: 'Bad Start',
    url: 'https://example.com',
    startsAt: 'invalid-datetime-string',
  };
  const badStartResult = validateAndSanitizeLink(badStart);
  assert.equal(badStartResult.ok, false);
  assert.match(badStartResult.error, /invalid start date/i);

  const badEnd = {
    title: 'Bad End',
    url: 'https://example.com',
    endsAt: '2026-99-99T99:99:99Z',
  };
  const badEndResult = validateAndSanitizeLink(badEnd);
  assert.equal(badEndResult.ok, false);
  assert.match(badEndResult.error, /invalid expiration date/i);
});

// 10. Public page single-now render pass determinism
await check('public-page-single-now: evaluates all links deterministically against captured renderNow', async () => {
  const renderNow = new Date('2026-08-14T12:00:00.000Z');
  const allLinks = [
    { title: 'Live Link', url: 'https://live.com', active: true },
    { title: 'Inactive Link', url: 'https://inactive.com', active: false },
    { title: 'Scheduled Link', url: 'https://scheduled.com', active: true, startsAt: futureDate },
    { title: 'Expired Link', url: 'https://expired.com', active: true, endsAt: pastDate },
  ];

  const publicRenderedLinks = allLinks.filter((link) => isLinkLive(link, renderNow));
  assert.equal(publicRenderedLinks.length, 1);
  assert.equal(publicRenderedLinks[0].title, 'Live Link');
});

console.log('\n================================');
console.log('Phase 3 Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log(`  SKIPPED: ${skipped}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
