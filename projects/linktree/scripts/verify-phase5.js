import assert from 'node:assert/strict';
import Event from '../models/Event.js';
import { parseDevice, normalizeReferrer } from '../lib/analyticsParser.js';
import { getAnalyticsData } from '../lib/analyticsData.js';
import connectToDatabase from '../lib/connectToDB.js';

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

console.log('--- Running Refined Phase 5 Analytics Worth Reading Verification ---\n');

// 1. Device Parser Unit Tests
await check('device-parser: accurately classifies mobile, tablet, desktop, and other user agents', async () => {
  // Mobile
  assert.equal(
    parseDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'),
    'mobile',
    'iPhone must be mobile'
  );
  assert.equal(
    parseDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36'),
    'mobile',
    'Android phone must be mobile'
  );

  // Tablet
  assert.equal(
    parseDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'),
    'tablet',
    'iPad must be tablet'
  );
  assert.equal(
    parseDevice('Mozilla/5.0 (Linux; Android 13; SM-X900) AppleWebKit/537.36 Safari/537.36'),
    'tablet',
    'Android tablet without "mobile" must be tablet'
  );

  // Desktop
  assert.equal(
    parseDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'),
    'desktop',
    'Macintosh must be desktop'
  );
  assert.equal(
    parseDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'),
    'desktop',
    'Windows must be desktop'
  );
  assert.equal(
    parseDevice('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'),
    'desktop',
    'Linux desktop must be desktop'
  );

  // Fallbacks
  assert.equal(parseDevice('curl/7.68.0'), 'other');
  assert.equal(parseDevice(''), 'other');
  assert.equal(parseDevice(null), 'other');
  assert.equal(parseDevice(undefined), 'other');
});

// 2. Conservative Referrer Normalization & Safety (subdomain preservation, safe www stripping)
await check('referrer-normalizer: strips safe www only, preserves arbitrary subdomains, handles direct & internal', async () => {
  const appUrl = 'https://linktree.example.com';

  // Strips www only
  assert.equal(normalizeReferrer('https://www.google.com/search?q=test', appUrl), 'google.com');
  assert.equal(normalizeReferrer('https://www.instagram.com/profile', appUrl), 'instagram.com');

  // Preserves valid subdomains & public suffixes without destructive truncation
  assert.equal(normalizeReferrer('https://blog.news.co.uk/articles/1', appUrl), 'blog.news.co.uk');
  assert.equal(normalizeReferrer('https://sub.my-site.org.au/path?query=1#hash', appUrl), 'sub.my-site.org.au');

  // Same-site canonical-host referrers classified as 'internal'
  assert.equal(normalizeReferrer('https://linktree.example.com/johndoe', appUrl), 'internal');
  assert.equal(normalizeReferrer('https://www.linktree.example.com/account', appUrl), 'internal');
  assert.equal(normalizeReferrer('http://localhost:3000/account', 'http://localhost:3000'), 'internal');

  // Missing / empty / malformed referrers classified as 'direct'
  assert.equal(normalizeReferrer('', appUrl), 'direct');
  assert.equal(normalizeReferrer(null, appUrl), 'direct');
  assert.equal(normalizeReferrer(undefined, appUrl), 'direct');
  assert.equal(normalizeReferrer('   ', appUrl), 'direct');
  assert.equal(normalizeReferrer('not-a-valid-url-%%%%', appUrl), 'direct');
});

// 3. Event Model Schema & Metadata Persistence
await check('event-schema: persists optional device and referrer without default values on historical events', async () => {
  const newEvent = new Event({
    type: 'click',
    page: 'testuser',
    url: 'https://github.com/test',
    device: 'mobile',
    referrer: 'twitter.com',
  });
  assert.equal(newEvent.device, 'mobile');
  assert.equal(newEvent.referrer, 'twitter.com');

  // Historical event without fields
  const legacyEvent = new Event({
    type: 'click',
    page: 'testuser',
    url: 'https://github.com/test',
  });
  assert.equal(legacyEvent.device, undefined, 'Historical records must not have forced default');
  assert.equal(legacyEvent.referrer, undefined, 'Historical records must not have forced default');
});

// 4. Strict Separation of View & Click Events
await check('event-type-separation: aggregations strictly separate views from clicks across all metrics', async () => {
  await connectToDatabase();
  const testUri = `test-sep-${Date.now()}`;

  try {
    const now = new Date();

    // 5 views from mobile/direct
    for (let i = 0; i < 5; i++) {
      await Event.create({
        page: testUri,
        type: 'view',
        url: testUri,
        device: 'mobile',
        referrer: 'direct',
        createdAt: now,
      });
    }

    // 2 clicks from desktop/google.com on Link A
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://link-a.com',
      device: 'desktop',
      referrer: 'google.com',
      createdAt: now,
    });
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://link-a.com',
      device: 'desktop',
      referrer: 'google.com',
      createdAt: now,
    });

    const links = [{ url: 'https://link-a.com', title: 'Link A' }];
    const data = await getAnalyticsData(testUri, links, '7d');

    // Total counts separate
    assert.equal(data.summary.totalViews, 5, 'Must report exactly 5 views');
    assert.equal(data.summary.totalClicks, 2, 'Must report exactly 2 clicks');

    // Device breakdown must only count clicks (desktop: 2, mobile: 0)
    const desktopClicks = data.deviceBreakdown.find((d) => d.key === 'desktop');
    assert.equal(desktopClicks?.count, 2, 'Clicks device breakdown must only include click events');
    const mobileClicks = data.deviceBreakdown.find((d) => d.key === 'mobile');
    assert.equal(mobileClicks, undefined, 'Views device data must not leak into clicks device breakdown');

    // Referrer breakdown must only count clicks (google.com: 2, direct: 0)
    const googleRef = data.referrerBreakdown.find((r) => r.domain === 'google.com');
    assert.equal(googleRef?.count, 2, 'Clicks referrer breakdown must only include click events');
    const directRef = data.referrerBreakdown.find((r) => r.domain === 'direct');
    assert.equal(directRef, undefined, 'Views referrer data must not leak into clicks referrer breakdown');
  } finally {
    await Event.deleteMany({ page: testUri });
  }
});

// 5. Historical Unknown vs New Direct/Internal Distinction
await check('historical-unknown-distinction: groups missing historical fields as "Unknown" without conflating direct', async () => {
  await connectToDatabase();
  const testUri = `test-hist-${Date.now()}`;

  try {
    const now = new Date();

    // 1 historical click (no device, no referrer)
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://old.com',
      createdAt: now,
    });

    // 1 new click with direct referrer & mobile device
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://new-direct.com',
      device: 'mobile',
      referrer: 'direct',
      createdAt: now,
    });

    // 1 new click with internal referrer & desktop device
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://new-internal.com',
      device: 'desktop',
      referrer: 'internal',
      createdAt: now,
    });

    const data = await getAnalyticsData(testUri, [], '7d');

    // Devices
    const unknownDevice = data.deviceBreakdown.find((d) => d.key === 'Unknown');
    assert.equal(unknownDevice?.count, 1, 'Historical record is Unknown device');
    const mobileDevice = data.deviceBreakdown.find((d) => d.key === 'mobile');
    assert.equal(mobileDevice?.count, 1, 'New direct record is mobile device');
    const desktopDevice = data.deviceBreakdown.find((d) => d.key === 'desktop');
    assert.equal(desktopDevice?.count, 1, 'New internal record is desktop device');

    // Referrers
    const unknownRef = data.referrerBreakdown.find((r) => r.domain === 'Unknown');
    assert.equal(unknownRef?.count, 1, 'Historical record is Unknown referrer');
    assert.equal(unknownRef?.name, 'Unknown (Historical)');

    const directRef = data.referrerBreakdown.find((r) => r.domain === 'direct');
    assert.equal(directRef?.count, 1, 'New direct record is direct referrer');
    assert.equal(directRef?.name, 'Direct / Bookmarks');

    const internalRef = data.referrerBreakdown.find((r) => r.domain === 'internal');
    assert.equal(internalRef?.count, 1, 'New internal record is internal referrer');
    assert.equal(internalRef?.name, 'Internal / Same-Site');
  } finally {
    await Event.deleteMany({ page: testUri });
  }
});

// 6. Exact UTC Timezone, Day-Boundary Semantics & Half-Open Window [windowStart, windowEnd)
await check('utc-day-boundaries: enforces half-open [windowStart, windowEnd), exact 7 and 30 bucket counts, and boundary inclusion/exclusion', async () => {
  await connectToDatabase();
  // Fixed reference timestamp: 2026-08-14T15:30:00.000Z
  const refTime = new Date('2026-08-14T15:30:00.000Z');
  const testUri = `test-utc-boundary-${Date.now()}`;

  try {
    // Insert boundary test events
    // Event 1: 1ms before windowStart (2026-08-07T23:59:59.999Z) -> MUST BE EXCLUDED
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://test.com/before-start',
      createdAt: new Date('2026-08-07T23:59:59.999Z'),
    });

    // Event 2: Exact windowStart (2026-08-08T00:00:00.000Z) -> MUST BE INCLUDED ($gte)
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://test.com/at-start',
      createdAt: new Date('2026-08-08T00:00:00.000Z'),
    });

    // Event 3: End of today UTC (2026-08-14T23:59:59.999Z) -> MUST BE INCLUDED ($lt)
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://test.com/at-end-today',
      createdAt: new Date('2026-08-14T23:59:59.999Z'),
    });

    // Event 4: Exact windowEnd tomorrow midnight (2026-08-15T00:00:00.000Z) -> MUST BE EXCLUDED ($lt)
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://test.com/at-window-end',
      createdAt: new Date('2026-08-15T00:00:00.000Z'),
    });

    // 7-day window verification
    const data7d = await getAnalyticsData(testUri, [], '7d', refTime);
    assert.equal(data7d.rangeDays, 7);
    assert.equal(data7d.windowStart, '2026-08-08T00:00:00.000Z');
    assert.equal(data7d.windowEnd, '2026-08-15T00:00:00.000Z');

    // Exactly 7 daily bucket points in chartData (header + 7 daily points = 8 elements)
    const dailyPoints7d = data7d.chartData.slice(1);
    assert.equal(dailyPoints7d.length, 7, '7d range must yield exactly 7 daily points');
    assert.equal(dailyPoints7d[0][0], '2026-08-08', 'First bucket is start date');
    assert.equal(dailyPoints7d[6][0], '2026-08-14', 'Last bucket is today (before windowEnd)');

    // Only events 2 and 3 should be counted (Events 1 and 4 excluded)
    assert.equal(data7d.summary.totalClicks, 2, 'Must count only events within [windowStart, windowEnd)');

    // 30-day window verification
    const data30d = await getAnalyticsData(testUri, [], '30d', refTime);
    assert.equal(data30d.rangeDays, 30);
    assert.equal(data30d.windowStart, '2026-07-16T00:00:00.000Z');
    assert.equal(data30d.windowEnd, '2026-08-15T00:00:00.000Z');

    // Exactly 30 daily bucket points in chartData (header + 30 daily points = 31 elements)
    const dailyPoints30d = data30d.chartData.slice(1);
    assert.equal(dailyPoints30d.length, 30, '30d range must yield exactly 30 daily points');
    assert.equal(dailyPoints30d[0][0], '2026-07-16', 'First bucket is 29 days before today');
    assert.equal(dailyPoints30d[29][0], '2026-08-14', 'Last bucket is today');
  } finally {
    await Event.deleteMany({ page: testUri });
  }
});

// 7. Invalid Range Fallback
await check('invalid-range-fallback: invalid or missing range parameters fallback safely to 7d', async () => {
  const testUri = `test-fallback-${Date.now()}`;

  const res1 = await getAnalyticsData(testUri, [], '90d');
  assert.equal(res1.selectedRange, '7d');
  assert.equal(res1.rangeDays, 7);

  const res2 = await getAnalyticsData(testUri, [], 'invalid-text');
  assert.equal(res2.selectedRange, '7d');

  const res3 = await getAnalyticsData(testUri, [], null);
  assert.equal(res3.selectedRange, '7d');

  const res4 = await getAnalyticsData(testUri, [], undefined);
  assert.equal(res4.selectedRange, '7d');
});

// 8. Deterministic Link Rankings & Zero-Click Retention (ANA-03)
await check('deterministic-ranking: sorts by clicks descending, breaks ties by link order, retains 0-click links', async () => {
  await connectToDatabase();
  const testUri = `test-rank-${Date.now()}`;

  try {
    const now = new Date();

    // 3 clicks for link B
    await Event.create({ page: testUri, type: 'click', url: 'https://b.com', createdAt: now });
    await Event.create({ page: testUri, type: 'click', url: 'https://b.com', createdAt: now });
    await Event.create({ page: testUri, type: 'click', url: 'https://b.com', createdAt: now });

    // 1 click for link A (index 0)
    await Event.create({ page: testUri, type: 'click', url: 'https://a.com', createdAt: now });

    // 1 click for link C (index 2) - tie with link A!
    await Event.create({ page: testUri, type: 'click', url: 'https://c.com', createdAt: now });

    const links = [
      { url: 'https://a.com', title: 'Alpha' },
      { url: 'https://b.com', title: 'Beta' },
      { url: 'https://c.com', title: 'Charlie' },
      { url: 'https://d.com', title: 'Delta (Zero Clicks)' },
    ];

    const data = await getAnalyticsData(testUri, links, '7d');
    const ranked = data.rankedLinks;

    // Must have all 4 links
    assert.equal(ranked.length, 4);

    // Rank 1: Beta (3 clicks, 60% share)
    assert.equal(ranked[0].rank, 1);
    assert.equal(ranked[0].title, 'Beta');
    assert.equal(ranked[0].clicks, 3);
    assert.equal(ranked[0].percentage, 60);

    // Rank 2: Alpha (1 click, 20% share - tie-break over Charlie because Alpha was at index 0)
    assert.equal(ranked[1].rank, 2);
    assert.equal(ranked[1].title, 'Alpha');
    assert.equal(ranked[1].clicks, 1);
    assert.equal(ranked[1].percentage, 20);

    // Rank 3: Charlie (1 click, 20% share)
    assert.equal(ranked[2].rank, 3);
    assert.equal(ranked[2].title, 'Charlie');
    assert.equal(ranked[2].clicks, 1);
    assert.equal(ranked[2].percentage, 20);

    // Rank 4: Delta (0 clicks, 0% share, retained at bottom)
    assert.equal(ranked[3].rank, 4);
    assert.equal(ranked[3].title, 'Delta (Zero Clicks)');
    assert.equal(ranked[3].clicks, 0);
    assert.equal(ranked[3].percentage, 0);
  } finally {
    await Event.deleteMany({ page: testUri });
  }
});

// 9. Zero-Event Empty State Detection (ANA-04)
await check('empty-state-detection: hasData is false when 0 events exist in the selected window', async () => {
  await connectToDatabase();
  const testUri = `test-empty-${Date.now()}`;

  const data = await getAnalyticsData(testUri, [{ url: 'https://unused.com', title: 'Unused' }], '7d');
  assert.equal(data.hasData, false);
  assert.equal(data.summary.totalViews, 0);
  assert.equal(data.summary.totalClicks, 0);
});

console.log('\n================================');
console.log('Phase 5 Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log(`  SKIPPED: ${skipped}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
