import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getLinkLifecycleStatus,
  isLinkLive,
  validateAndSanitizeLink,
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

console.log('--- Running Phase 3 Link Lifecycle Verification ---\n');

const now = new Date('2026-08-14T12:00:00.000Z');
const pastDate = new Date('2026-08-14T10:00:00.000Z');
const futureDate = new Date('2026-08-14T14:00:00.000Z');
const farFutureDate = new Date('2026-08-14T18:00:00.000Z');

// 1. Inactive precedence
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

  // Even with future startsAt
  const linkInactiveScheduled = {
    title: 'Inactive Scheduled',
    url: 'https://example.com',
    active: false,
    startsAt: futureDate,
  };
  assert.equal(getLinkLifecycleStatus(linkInactiveScheduled, now), 'inactive');
  assert.equal(isLinkLive(linkInactiveScheduled, now), false);
});

// 2. Scheduled state
await check('link-lifecycle-scheduled: startsAt > now is scheduled and not live', async () => {
  const linkScheduled = {
    title: 'Upcoming Promo',
    url: 'https://example.com/promo',
    active: true,
    startsAt: futureDate,
    endsAt: farFutureDate,
  };

  assert.equal(getLinkLifecycleStatus(linkScheduled, now), 'scheduled');
  assert.equal(isLinkLive(linkScheduled, now), false);
});

// 3. Expired state
await check('link-lifecycle-expired: now >= endsAt is expired and not live', async () => {
  const linkExpired = {
    title: 'Ended Deal',
    url: 'https://example.com/deal',
    active: true,
    startsAt: new Date('2026-08-14T08:00:00.000Z'),
    endsAt: pastDate,
  };

  assert.equal(getLinkLifecycleStatus(linkExpired, now), 'expired');
  assert.equal(isLinkLive(linkExpired, now), false);
});

// 4. Live bounded window
await check('link-lifecycle-live-window: startsAt <= now < endsAt is live', async () => {
  const linkLive = {
    title: 'Current Event',
    url: 'https://example.com/event',
    active: true,
    startsAt: pastDate,
    endsAt: futureDate,
  };

  assert.equal(getLinkLifecycleStatus(linkLive, now), 'live');
  assert.equal(isLinkLive(linkLive, now), true);
});

// 5. Start-only and end-only unconstrained schedules
await check('link-lifecycle-partial-schedules: handles start-only and end-only schedules', async () => {
  // Start-only in past -> live
  const startOnlyPast = { active: true, startsAt: pastDate };
  assert.equal(getLinkLifecycleStatus(startOnlyPast, now), 'live');
  assert.equal(isLinkLive(startOnlyPast, now), true);

  // Start-only in future -> scheduled
  const startOnlyFuture = { active: true, startsAt: futureDate };
  assert.equal(getLinkLifecycleStatus(startOnlyFuture, now), 'scheduled');
  assert.equal(isLinkLive(startOnlyFuture, now), false);

  // End-only in future -> live
  const endOnlyFuture = { active: true, endsAt: futureDate };
  assert.equal(getLinkLifecycleStatus(endOnlyFuture, now), 'live');
  assert.equal(isLinkLive(endOnlyFuture, now), true);

  // End-only in past -> expired
  const endOnlyPast = { active: true, endsAt: pastDate };
  assert.equal(getLinkLifecycleStatus(endOnlyPast, now), 'expired');
  assert.equal(isLinkLive(endOnlyPast, now), false);
});

// 6. Legacy backward compatibility (LINK-04)
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

// 7. Server validation: invalid date range endsAt <= startsAt rejected
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

  // Equal times
  const equalTimes = {
    title: 'Equal Times',
    url: 'https://example.com',
    startsAt: '2026-08-14T12:00:00.000Z',
    endsAt: '2026-08-14T12:00:00.000Z',
  };
  const equalValidation = validateAndSanitizeLink(equalTimes);
  assert.equal(equalValidation.ok, false);
  assert.match(equalValidation.error, /expiration time must be after start time/i);
});

// 8. Server validation: malformed timestamp strings rejected
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

// 9. Server validation: valid payload sanitized into Mongoose Dates
await check('link-validation-sanitization: valid links sanitized and coerced to Date objects', async () => {
  const validPayload = {
    title: 'Good Link',
    url: 'https://example.com',
    active: true,
    startsAt: '2026-08-14T10:00:00.000Z',
    endsAt: '2026-08-14T14:00:00.000Z',
  };

  const result = validateAndSanitizeLink(validPayload);
  assert.equal(result.ok, true);
  assert.equal(result.link.active, true);
  assert.ok(result.link.startsAt instanceof Date);
  assert.ok(result.link.endsAt instanceof Date);
  assert.equal(result.link.startsAt.toISOString(), '2026-08-14T10:00:00.000Z');
  assert.equal(result.link.endsAt.toISOString(), '2026-08-14T14:00:00.000Z');
});

// 10. Public page server-authoritative filtering
await check('public-page-server-filtering: excludes non-live links from public rendering', async () => {
  const allLinks = [
    { title: 'Live Link', url: 'https://live.com', active: true },
    { title: 'Inactive Link', url: 'https://inactive.com', active: false },
    { title: 'Scheduled Link', url: 'https://scheduled.com', active: true, startsAt: futureDate },
    { title: 'Expired Link', url: 'https://expired.com', active: true, endsAt: pastDate },
  ];

  const publicRenderedLinks = allLinks.filter((link) => isLinkLive(link, now));
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
