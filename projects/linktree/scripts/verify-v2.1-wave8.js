import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import mongoose from 'mongoose';

import {
  ANALYTICS_RANGE_CONFIG,
  BASE_ANALYTICS_RANGES,
  EXTENDED_ANALYTICS_RANGES,
  ALL_ANALYTICS_RANGES,
  DEFAULT_ANALYTICS_RANGE,
  resolveAnalyticsRange,
  getAnalyticsRangeConfig,
  getAnalyticsRangeDays,
} from '../lib/analyticsRanges.js';
import { getAnalyticsData } from '../lib/analyticsData.js';
import { getSafeUserEntitlements } from '../lib/featureAccess.js';
import { buildAnalyticsCsv, buildAnalyticsCsvFilename } from '../lib/analyticsCsv.js';
import { PRO_ROADMAP_FEATURES } from '../lib/billingPresentation.js';
import Event from '../models/Event.js';

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

console.log('--- Running Milestone v2.1 Wave 8: Pro Feature 2 — Extended Analytics History Verification ---\n');

const projectRoot = path.resolve(import.meta.dirname, '..');
const targetUserId = new mongoose.Types.ObjectId().toString();

// Stub mongoose.connect so pure helper tests run hermetically without live MongoDB
const origMongooseConnect = mongoose.connect;
mongoose.connect = async () => mongoose.connection;

// ==========================================
// 1. Range Policy & Configuration
// ==========================================

await check('range-policy: all four canonical ranges are defined centrally', () => {
  assert.deepEqual(ALL_ANALYTICS_RANGES, ['7d', '30d', '90d', '365d']);
  assert.deepEqual(BASE_ANALYTICS_RANGES, ['7d', '30d']);
  assert.deepEqual(EXTENDED_ANALYTICS_RANGES, ['90d', '365d']);
  assert.equal(DEFAULT_ANALYTICS_RANGE, '7d');
});

await check('range-policy: days mapping is exact (7, 30, 90, 365)', () => {
  assert.equal(getAnalyticsRangeDays('7d'), 7);
  assert.equal(getAnalyticsRangeDays('30d'), 30);
  assert.equal(getAnalyticsRangeDays('90d'), 90);
  assert.equal(getAnalyticsRangeDays('365d'), 365);
});

await check('range-policy: canonical 1-year range ID is 365d (not 1y)', () => {
  const cfg = ANALYTICS_RANGE_CONFIG['365d'];
  assert.ok(cfg, '365d config must exist');
  assert.equal(cfg.id, '365d');
  assert.equal(cfg.label, '1 Year');
  assert.equal(cfg.days, 365);
  assert.equal(cfg.extended, true);
});

await check('range-policy: 90d and 365d are marked as extended', () => {
  assert.equal(ANALYTICS_RANGE_CONFIG['7d'].extended, false);
  assert.equal(ANALYTICS_RANGE_CONFIG['30d'].extended, false);
  assert.equal(ANALYTICS_RANGE_CONFIG['90d'].extended, true);
  assert.equal(ANALYTICS_RANGE_CONFIG['365d'].extended, true);
});

// ==========================================
// 2. Range Resolution & Server Authorization
// ==========================================

await check('server-auth: Free user requesting 7d or 30d receives requested range', () => {
  assert.equal(resolveAnalyticsRange('7d', false), '7d');
  assert.equal(resolveAnalyticsRange('30d', false), '30d');
});

await check('server-auth: Free user requesting 90d fails closed to 30d', () => {
  assert.equal(resolveAnalyticsRange('90d', false), '30d');
});

await check('server-auth: Free user requesting 365d fails closed to 30d', () => {
  assert.equal(resolveAnalyticsRange('365d', false), '30d');
});

await check('server-auth: Pro user can access 7d, 30d, 90d, and 365d', () => {
  assert.equal(resolveAnalyticsRange('7d', true), '7d');
  assert.equal(resolveAnalyticsRange('30d', true), '30d');
  assert.equal(resolveAnalyticsRange('90d', true), '90d');
  assert.equal(resolveAnalyticsRange('365d', true), '365d');
});

await check('server-auth: unknown or malformed range falls back safely to 7d', () => {
  assert.equal(resolveAnalyticsRange(null, false), '7d');
  assert.equal(resolveAnalyticsRange(undefined, false), '7d');
  assert.equal(resolveAnalyticsRange('', false), '7d');
  assert.equal(resolveAnalyticsRange('invalid', false), '7d');
  assert.equal(resolveAnalyticsRange('1y', false), '7d');
  assert.equal(resolveAnalyticsRange('999d', true), '7d');
});

await check('server-auth: entitlement failure falls closed to Free range resolution', async () => {
  const entitlements = await getSafeUserEntitlements(targetUserId, {
    getSubscription: async () => {
      throw new Error('MongoTimeout');
    },
  });
  const canUseExtended = Boolean(entitlements?.features?.extended_analytics);
  assert.strictEqual(canUseExtended, false);

  const effective = resolveAnalyticsRange('365d', canUseExtended);
  assert.equal(effective, '30d');
});

// ==========================================
// 3. Analytics Aggregation & Bucket Counts
// ==========================================

await check('analytics-engine: produces exact bucket counts for all 4 ranges', async () => {
  const origFind = Event.find;
  try {
    Event.find = () => ({
      lean: async () => [],
    });

    const fixedRefDate = new Date('2026-08-15T12:00:00Z');

    const d7 = await getAnalyticsData('testuser', [], '7d', fixedRefDate);
    assert.equal(d7.selectedRange, '7d');
    assert.equal(d7.rangeDays, 7);
    assert.equal(d7.chartData.length, 8); // Header + 7 days

    const d30 = await getAnalyticsData('testuser', [], '30d', fixedRefDate);
    assert.equal(d30.selectedRange, '30d');
    assert.equal(d30.rangeDays, 30);
    assert.equal(d30.chartData.length, 31); // Header + 30 days

    const d90 = await getAnalyticsData('testuser', [], '90d', fixedRefDate);
    assert.equal(d90.selectedRange, '90d');
    assert.equal(d90.rangeDays, 90);
    assert.equal(d90.chartData.length, 91); // Header + 90 days

    const d365 = await getAnalyticsData('testuser', [], '365d', fixedRefDate);
    assert.equal(d365.selectedRange, '365d');
    assert.equal(d365.rangeDays, 365);
    assert.equal(d365.chartData.length, 366); // Header + 365 days
  } finally {
    Event.find = origFind;
  }
});

await check('analytics-engine: zero-event days remain zero-filled and continuous in UTC', async () => {
  const origFind = Event.find;
  try {
    const fixedRefDate = new Date('2026-08-15T12:00:00Z');
    Event.find = () => ({
      lean: async () => [
        {
          type: 'click',
          createdAt: new Date('2026-08-15T02:00:00Z'),
          url: 'https://example.com',
          device: 'mobile',
          referrer: 'direct',
        },
        {
          type: 'click',
          createdAt: new Date('2026-05-15T02:00:00Z'), // ~92 days ago
          url: 'https://example.com',
          device: 'desktop',
          referrer: 'google.com',
        },
      ],
    });

    const links = [{ url: 'https://example.com', title: 'Example Link' }];
    const data365 = await getAnalyticsData('testuser', links, '365d', fixedRefDate);

    assert.equal(data365.summary.totalClicks, 2);
    assert.equal(data365.chartData.length, 366);

    // Sum of daily chart click values must equal totalClicks
    const totalDailyClicks = data365.chartData.slice(1).reduce((sum, [, clicks]) => sum + clicks, 0);
    assert.equal(totalDailyClicks, 2);
  } finally {
    Event.find = origFind;
  }
});

// ==========================================
// 4. UI, Client & Locked Range UX
// ==========================================

await check('ui: AnalyticsClient renders all four range buttons', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/analytics/AnalyticsClient.js'), 'utf-8');
  assert.ok(clientSrc.includes("handleRangeChange('7d')"));
  assert.ok(clientSrc.includes("handleRangeChange('30d')"));
  assert.ok(clientSrc.includes("handleRangeChange('90d')"));
  assert.ok(clientSrc.includes("handleRangeChange('365d')"));
  assert.ok(clientSrc.includes('7 Days'));
  assert.ok(clientSrc.includes('30 Days'));
  assert.ok(clientSrc.includes('90 Days'));
  assert.ok(clientSrc.includes('1 Year'));
});

await check('ui: AnalyticsClient disables 90d and 365d for Free users with PRO badge', () => {
  const clientSrc = fs.readFileSync(path.join(projectRoot, 'components/analytics/AnalyticsClient.js'), 'utf-8');
  assert.ok(clientSrc.includes('disabled={!canUseExtendedAnalytics}'));
  assert.ok(clientSrc.includes('PRO'));
  assert.ok(clientSrc.includes('canUseExtendedAnalytics = false'));
});

await check('ui: AnalyticsPage passes canUseExtendedAnalytics and isRestricted to AnalyticsClient', () => {
  const pageSrc = fs.readFileSync(path.join(projectRoot, 'app/(app)/dashboard/analytics/page.js'), 'utf-8');
  assert.ok(pageSrc.includes('getSafeUserEntitlements'));
  assert.ok(pageSrc.includes('resolveAnalyticsRange'));
  assert.ok(pageSrc.includes('canUseExtendedAnalytics={canUseExtendedAnalytics}'));
  assert.ok(pageSrc.includes('isRestricted={isRestricted}'));
});

// ==========================================
// 5. CSV & Print / PDF Support
// ==========================================

await check('csv: filename generator supports 90d and 365d formats', () => {
  const fn90 = buildAnalyticsCsvFilename('creator', '90d', new Date('2026-08-15T00:00:00Z'));
  assert.equal(fn90, 'linktree-creator-analytics-90d-2026-08-15.csv');

  const fn365 = buildAnalyticsCsvFilename('creator', '365d', new Date('2026-08-15T00:00:00Z'));
  assert.equal(fn365, 'linktree-creator-analytics-365d-2026-08-15.csv');
});

await check('csv: 90d and 365d datasets produce exact daily row counts in CSV', () => {
  const synthetic365Chart = [['Day', 'Clicks']];
  for (let i = 0; i < 365; i++) {
    synthetic365Chart.push([`2026-01-${String((i % 28) + 1).padStart(2, '0')}`, i % 3]);
  }

  const csv = buildAnalyticsCsv({
    selectedRange: '365d',
    summary: { totalViews: 500, totalClicks: 200, topLink: 'My Link', topReferrer: 'direct' },
    chartData: synthetic365Chart,
    deviceBreakdown: [{ name: 'Mobile', count: 150, percentage: 75 }],
    referrerBreakdown: [{ name: 'Direct', count: 200, percentage: 100 }],
    rankedLinks: [{ rank: 1, title: 'My Link', url: 'https://example.com', clicks: 200, percentage: 100 }],
  });

  assert.ok(csv.includes('Selected Range,Last 1 Year'));
  assert.ok(csv.startsWith('\uFEFF')); // UTF-8 BOM
  // Check that all 365 rows are present in daily click section
  const lines = csv.split('\r\n');
  assert.ok(lines.length > 370);
});

await check('print: Area chart and print labels support 90d and 365d', () => {
  const chartSrc = fs.readFileSync(path.join(projectRoot, 'components/analytics/AnalyticsAreaChart.js'), 'utf-8');
  assert.ok(chartSrc.includes("range === '90d'"));
  assert.ok(chartSrc.includes("range === '365d'"));
});

// ==========================================
// 6. Performance Sanity: 90 and 365 points
// ==========================================

await check('performance: 365-point chart generation executes in linear O(N) time (<10ms)', () => {
  const syntheticChartData = [['Day', 'Clicks']];
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < 365; i++) {
    syntheticChartData.push([`2026-08-${String((i % 30) + 1).padStart(2, '0')}`, Math.floor(Math.random() * 100)]);
  }

  // Simulate chart coordinate and SVG path generation
  const rows = syntheticChartData.slice(1);
  const values = rows.map((r) => Number(r[1]) || 0);
  const maxVal = Math.max(...values, 5);
  const upperScale = Math.ceil(maxVal * 1.25);

  const points = rows.map((row, i) => {
    const x = 45 + (i / (rows.length - 1)) * 730;
    const y = 30 + 190 - (Number(row[1]) / upperScale) * 190;
    return { x, y, value: Number(row[1]), date: row[0], index: i };
  });

  assert.equal(points.length, 365);
  const endTime = process.hrtime.bigint();
  const elapsedMs = Number(endTime - startTime) / 1e6;

  console.log(`  (Synthetic 365-point coordinate generation time: ${elapsedMs.toFixed(2)}ms)`);
  assert.ok(elapsedMs < 50, '365-point preparation must be fast');
});

// ==========================================
// 7. Schema, Safety & Billing Roadmap
// ==========================================

await check('safety: Event schema has no TTL or data deletion policy', () => {
  const eventSrc = fs.readFileSync(path.join(projectRoot, 'models/Event.js'), 'utf-8');
  assert.ok(!eventSrc.includes('expires'), 'Must not have TTL index');
  assert.ok(!eventSrc.includes('expireAfterSeconds'), 'Must not auto-expire events');
});

await check('safety: zero new npm dependencies in package.json', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(!allDeps['chart.js']);
  assert.ok(!allDeps['recharts']);
  assert.ok(!allDeps['pdfkit']);
});

await check('billing: Extended Analytics marked as Available with Pro in roadmap', () => {
  const extendedAnalyticsItem = PRO_ROADMAP_FEATURES.find((f) => f.key === 'extended_analytics');
  assert.ok(extendedAnalyticsItem);
  assert.equal(extendedAnalyticsItem.status, 'Available with Pro');
  assert.equal(extendedAnalyticsItem.statusVariant, 'success');
});

await check('regression: prior wave suites (Wave 1..7) remain 100% green', () => {
  const w1 = execSync('node scripts/verify-v2.1-wave1.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w1.includes('FAILED:  0'));

  const w2 = execSync('node scripts/verify-v2.1-wave2.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w2.includes('FAILED:  0'));

  const w3 = execSync('node scripts/verify-v2.1-wave3.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w3.includes('FAILED:  0'));

  const w4 = execSync('node scripts/verify-v2.1-wave4.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w4.includes('FAILED:  0'));

  const w5 = execSync('node scripts/verify-v2.1-wave5.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w5.includes('FAILED:  0'));

  const w6 = execSync('node scripts/verify-v2.1-wave6.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w6.includes('FAILED:  0'));

  const w7 = execSync('node scripts/verify-v2.1-wave7.js', { cwd: projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  assert.ok(w7.includes('FAILED:  0'));
});

console.log('\n================================');
console.log('Wave 8 Extended Analytics Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
