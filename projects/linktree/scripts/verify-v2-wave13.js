import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { escapeCsvCell, buildAnalyticsCsv, buildAnalyticsCsvFilename } from '../lib/analyticsCsv.js';
import { getAnalyticsData } from '../lib/analyticsData.js';

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

console.log('--- Running Wave 13 Analytics CSV Export Verification ---\n');

// Mock synthetic analytics dataset for 7d
const mockAnalytics7d = {
  selectedRange: '7d',
  rangeDays: 7,
  windowStart: '2026-08-08T00:00:00.000Z',
  windowEnd: '2026-08-15T00:00:00.000Z',
  hasData: true,
  summary: {
    totalViews: 142,
    totalClicks: 89,
    topLink: 'My Portfolio',
    topReferrer: 'twitter.com',
  },
  chartData: [
    ['Day', 'Clicks'],
    ['2026-08-08', 5],
    ['2026-08-09', 12],
    ['2026-08-10', 0],
    ['2026-08-11', 20],
    ['2026-08-12', 15],
    ['2026-08-13', 0],
    ['2026-08-14', 37],
  ],
  deviceBreakdown: [
    { name: 'Mobile', key: 'mobile', count: 60, percentage: 67.4 },
    { name: 'Desktop', key: 'desktop', count: 25, percentage: 28.1 },
    { name: 'Unknown (Historical)', key: 'Unknown', count: 4, percentage: 4.5 },
  ],
  referrerBreakdown: [
    { domain: 'twitter.com', name: 'twitter.com', count: 50, percentage: 56.2 },
    { domain: 'direct', name: 'Direct / Bookmarks', count: 20, percentage: 22.5 },
    { domain: 'internal', name: 'Internal / Same-Site', count: 10, percentage: 11.2 },
    { domain: 'Unknown', name: 'Unknown (Historical)', count: 9, percentage: 10.1 },
  ],
  rankedLinks: [
    { rank: 1, title: 'My Portfolio', url: 'https://princeji.com', clicks: 50, percentage: 56.2 },
    { rank: 2, title: 'GitHub Profile', url: 'https://github.com/princeji100', clicks: 39, percentage: 43.8 },
    { rank: 3, title: 'Zero Click Link', url: 'https://example.com', clicks: 0, percentage: 0 },
  ],
};

// Mock synthetic analytics dataset for 30d
const mockAnalytics30d = {
  ...mockAnalytics7d,
  selectedRange: '30d',
  rangeDays: 30,
  chartData: [
    ['Day', 'Clicks'],
    ...Array.from({ length: 30 }, (_, i) => [`2026-07-${String(i + 1).padStart(2, '0')}`, i % 3 === 0 ? 0 : i]),
  ],
};

// 1. Formula Injection & Security Escaping
await check('formula-injection-neutralization: prefixes dangerous leading formula chars with single quote and quotes properly', async () => {
  assert.equal(escapeCsvCell('=1+1'), `"'=1+1"`);
  assert.equal(escapeCsvCell('+cmd|...'), `"'+cmd|..."`);
  assert.equal(escapeCsvCell('-2+3*4'), ` "'-2+3*4"`.trim());
  assert.equal(escapeCsvCell('@SUM(A1:A10)'), `"'@SUM(A1:A10)"`);
  assert.equal(escapeCsvCell('\tTabLeading'), `"'\tTabLeading"`);

  // Ordinary numbers remain pure numeric representations
  assert.equal(escapeCsvCell(142), '142');
  assert.equal(escapeCsvCell(0), '0');
  assert.equal(escapeCsvCell('100'), '100');
  assert.equal(escapeCsvCell('-5'), '-5'); // Plain number string preserved
});

// 2. Standard CSV Escaping (Commas, Quotes, Newlines)
await check('csv-escaping: escapes commas, quotes, and newlines safely', async () => {
  assert.equal(escapeCsvCell('Hello, World'), '"Hello, World"');
  assert.equal(escapeCsvCell('He said "hello"'), '"He said ""hello"""');
  assert.equal(escapeCsvCell('Line 1\nLine 2'), '"Line 1\nLine 2"');
  assert.equal(escapeCsvCell(null), '');
  assert.equal(escapeCsvCell(undefined), '');
});

// 3. 7-Day & 30-Day Export Structure & Row Counts
await check('export-structure: produces exact 7 daily rows for 7d and 30 daily rows for 30d with UTF-8 BOM and CRLF', async () => {
  const csv7d = buildAnalyticsCsv(mockAnalytics7d, { generatedAt: '2026-08-15T02:45:00.000Z' });

  assert.ok(csv7d.startsWith('\uFEFF'), 'Must contain UTF-8 BOM');
  assert.ok(csv7d.includes('\r\n'), 'Must use CRLF line endings');
  assert.ok(csv7d.includes('Selected Range,Last 7 Days'));
  assert.ok(csv7d.includes('Total Views,142'));
  assert.ok(csv7d.includes('Total Clicks,89'));

  // Verify exactly 7 daily data rows
  const dailySection7d = csv7d.split('Date UTC,Clicks\r\n')[1].split('\r\n\r\n')[0];
  const dailyRows7d = dailySection7d.trim().split('\r\n');
  assert.equal(dailyRows7d.length, 7, '7d report must contain exactly 7 daily rows');

  // Verify 30d
  const csv30d = buildAnalyticsCsv(mockAnalytics30d, { generatedAt: '2026-08-15T02:45:00.000Z' });
  assert.ok(csv30d.includes('Selected Range,Last 30 Days'));
  const dailySection30d = csv30d.split('Date UTC,Clicks\r\n')[1].split('\r\n\r\n')[0];
  const dailyRows30d = dailySection30d.trim().split('\r\n');
  assert.equal(dailyRows30d.length, 30, '30d report must contain exactly 30 daily rows');
});

// 4. Breakdown Fidelity & Attribution Invariants
await check('attribution-preservation: preserves direct, internal, and Unknown (Historical) categories', async () => {
  const csv = buildAnalyticsCsv(mockAnalytics7d);

  assert.ok(csv.includes('Direct / Bookmarks,20,22.5%'));
  assert.ok(csv.includes('Internal / Same-Site,10,11.2%'));
  assert.ok(csv.includes('Unknown (Historical),9,10.1%'));
  assert.ok(csv.includes('Mobile,60,67.4%'));
  assert.ok(csv.includes('Desktop,25,28.1%'));

  // Link Ranking order & zero-click link presence
  assert.ok(csv.includes('1,My Portfolio,https://princeji.com,50,56.2%'));
  assert.ok(csv.includes('2,GitHub Profile,https://github.com/princeji100,39,43.8%'));
  assert.ok(csv.includes('3,Zero Click Link,https://example.com,0,0%'), 'Zero-click links must be exported');
});

// 5. Empty Dataset Behavior
await check('empty-dataset-safe: exports valid zero-filled CSV without crashing', async () => {
  const emptyAnalytics = {
    selectedRange: '7d',
    rangeDays: 7,
    windowStart: '2026-08-08T00:00:00.000Z',
    windowEnd: '2026-08-15T00:00:00.000Z',
    hasData: false,
    summary: { totalViews: 0, totalClicks: 0, topLink: 'None', topReferrer: 'None' },
    chartData: [
      ['Day', 'Clicks'],
      ['2026-08-08', 0],
      ['2026-08-09', 0],
      ['2026-08-10', 0],
      ['2026-08-11', 0],
      ['2026-08-12', 0],
      ['2026-08-13', 0],
      ['2026-08-14', 0],
    ],
    deviceBreakdown: [],
    referrerBreakdown: [],
    rankedLinks: [],
  };

  const emptyCsv = buildAnalyticsCsv(emptyAnalytics);
  assert.ok(emptyCsv.startsWith('\uFEFF'));
  assert.ok(emptyCsv.includes('Total Views,0'));
  assert.ok(emptyCsv.includes('Total Clicks,0'));
});

// 6. Filename Builder Invariants
await check('filename-builder: produces standard lowercase safe filenames with URI, range, and date', async () => {
  const fixedDate = new Date('2026-08-15T12:00:00Z');
  assert.equal(buildAnalyticsCsvFilename('princeji', '7d', fixedDate), 'linktree-princeji-analytics-7d-2026-08-15.csv');
  assert.equal(buildAnalyticsCsvFilename('princeji', '30d', fixedDate), 'linktree-princeji-analytics-30d-2026-08-15.csv');
  assert.equal(buildAnalyticsCsvFilename('', '7d', fixedDate), 'linktree-analytics-7d-2026-08-15.csv');
});

// 7. Component Source & Zero Dependencies Invariants
await check('zero-dependencies-and-backend: client-only CSV download without backend export routes or xlsx packages', async () => {
  const clientSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/analytics/AnalyticsClient.js'),
    'utf8'
  );

  assert.ok(clientSrc.includes('buildAnalyticsCsv'), 'Uses client-side CSV builder');
  assert.ok(clientSrc.includes('Blob'), 'Uses native Blob API');
  assert.ok(clientSrc.includes('createObjectURL'), 'Uses native URL.createObjectURL');
  assert.ok(clientSrc.includes('revokeObjectURL'), 'Revokes Blob URL to prevent leaks');

  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('xlsx'));
  assert.ok(!deps.includes('papaparse'));
  assert.ok(!deps.includes('csv-writer'));
});

console.log('\n================================');
console.log(`Wave 13 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
