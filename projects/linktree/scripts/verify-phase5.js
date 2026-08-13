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

console.log('--- Running Phase 5 Analytics Worth Reading Verification ---\n');

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

// 2. Referrer Normalizer Unit Tests
await check('referrer-normalizer: extracts clean domain, strips www, resolves redirects, handles direct fallbacks', async () => {
  const appUrl = 'https://linktree.app';

  // Standard external referrers
  assert.equal(normalizeReferrer('https://www.google.com/search?q=linktree', appUrl), 'google.com');
  assert.equal(normalizeReferrer('https://instagram.com/username', appUrl), 'instagram.com');
  assert.equal(normalizeReferrer('http://www.github.com/project', appUrl), 'github.com');

  // Known redirector & mobile subdomains
  assert.equal(normalizeReferrer('https://t.co/xyz123', appUrl), 'twitter.com');
  assert.equal(normalizeReferrer('https://l.instagram.com/?u=https%3A', appUrl), 'instagram.com');
  assert.equal(normalizeReferrer('https://lm.facebook.com/l.php?u=...', appUrl), 'facebook.com');
  assert.equal(normalizeReferrer('https://youtu.be/video123', appUrl), 'youtube.com');
  assert.equal(normalizeReferrer('https://lnkd.in/post123', appUrl), 'linkedin.com');

  // Same-origin or internal referrers -> 'direct'
  assert.equal(normalizeReferrer('https://linktree.app/johndoe', appUrl), 'direct');
  assert.equal(normalizeReferrer('http://localhost:3000/account', 'http://localhost:3000'), 'direct');

  // Direct / empty / malformed referrers
  assert.equal(normalizeReferrer('', appUrl), 'direct');
  assert.equal(normalizeReferrer(null, appUrl), 'direct');
  assert.equal(normalizeReferrer(undefined, appUrl), 'direct');
  assert.equal(normalizeReferrer('not a url %%%', appUrl), 'direct');
});

// 3. Event Model Schema & Metadata Persistence
await check('event-schema: Event model persists device and referrer without forcing defaults on historical events', async () => {
  // A: Modern event with device and referrer
  const newEvent = new Event({
    type: 'click',
    page: 'testuser',
    url: 'https://github.com/test',
    device: 'mobile',
    referrer: 'twitter.com',
  });
  assert.equal(newEvent.device, 'mobile');
  assert.equal(newEvent.referrer, 'twitter.com');

  // B: Historical event representation (fields omitted)
  const legacyEvent = new Event({
    type: 'click',
    page: 'testuser',
    url: 'https://github.com/test',
  });
  assert.equal(legacyEvent.device, undefined, 'Historical records must not have forced schema default');
  assert.equal(legacyEvent.referrer, undefined, 'Historical records must not have forced schema default');
});

// 4. Server-Side Aggregations & Historical Event Grouping (Integration)
await check('analytics-aggregations: groups historical events with missing metadata into "Unknown" bucket', async () => {
  await connectToDatabase();
  const testUri = `test-analytics-${Date.now()}`;

  try {
    const now = new Date();

    // Insert 1 modern click event (with device & referrer)
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://example.com/one',
      device: 'desktop',
      referrer: 'google.com',
      createdAt: now,
    });

    // Insert 1 historical click event (without device & referrer)
    await Event.create({
      page: testUri,
      type: 'click',
      url: 'https://example.com/two',
      createdAt: now,
    });

    // Insert 1 view event
    await Event.create({
      page: testUri,
      type: 'view',
      url: testUri,
      device: 'mobile',
      referrer: 'direct',
      createdAt: now,
    });

    const links = [
      { url: 'https://example.com/one', title: 'Link One' },
      { url: 'https://example.com/two', title: 'Link Two' },
      { url: 'https://example.com/three', title: 'Link Three (Unclicked)' },
    ];

    const data7d = await getAnalyticsData(testUri, links, '7d');

    assert.equal(data7d.selectedRange, '7d');
    assert.equal(data7d.summary.totalViews, 1);
    assert.equal(data7d.summary.totalClicks, 2);
    assert.equal(data7d.hasData, true);

    // Verify historical missing fields appear in "Unknown" breakdown
    const unknownDevice = data7d.deviceBreakdown.find((d) => d.key === 'Unknown');
    assert.ok(unknownDevice, 'Unknown device bucket must exist');
    assert.equal(unknownDevice.count, 1, 'Historical event grouped into Unknown');

    const unknownReferrer = data7d.referrerBreakdown.find((r) => r.domain === 'Unknown');
    assert.ok(unknownReferrer, 'Unknown referrer bucket must exist');
    assert.equal(unknownReferrer.count, 1, 'Historical event grouped into Unknown');
  } finally {
    await Event.deleteMany({ page: testUri });
  }
});

// 5. Continuous Daily Timeline Chart
await check('continuous-timeline: generates continuous date points for every day in window', async () => {
  await connectToDatabase();
  const testUri = `test-timeline-${Date.now()}`;

  try {
    const data7d = await getAnalyticsData(testUri, [], '7d');
    // Header + 7 calendar days = 8 rows
    assert.equal(data7d.chartData.length, 8, '7-day window must have exactly 8 chart rows');
    assert.equal(data7d.chartData[0][0], 'Day');
    assert.equal(data7d.chartData[0][1], 'Clicks');

    const data30d = await getAnalyticsData(testUri, [], '30d');
    // Header + 30 calendar days = 31 rows
    assert.equal(data30d.chartData.length, 31, '30-day window must have exactly 31 chart rows');
  } finally {
    await Event.deleteMany({ page: testUri });
  }
});

// 6. Deterministic Link Rankings & Zero-Click Preservation (ANA-03)
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

// 7. Empty State Detection (ANA-04)
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
