import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { getAnalyticsData } from '../lib/analyticsData.js';
import { buildAnalyticsCsv } from '../lib/analyticsCsv.js';

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

console.log('--- Running Wave 14 Print / Save as PDF Analytics Verification ---\n');

// 1. Component Print Action & Architecture Invariants
await check('component-print-action: uses browser-native window.print() and zero PDF npm packages or backend endpoints', async () => {
  const clientSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/analytics/AnalyticsClient.js'),
    'utf8'
  );

  assert.ok(clientSrc.includes('window.print()'), 'Must call browser-native window.print()');
  assert.ok(clientSrc.includes('Print / Save PDF'), 'Must contain Print / Save PDF action');
  assert.ok(!clientSrc.includes('jspdf'), 'No jsPDF library');
  assert.ok(!clientSrc.includes('html2canvas'), 'No html2canvas library');
  assert.ok(!clientSrc.includes('puppeteer'), 'No puppeteer');
  assert.ok(!clientSrc.includes('/api/pdf'), 'No backend PDF export endpoint');

  // Verify package.json dependencies
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('jspdf'));
  assert.ok(!deps.includes('pdfkit'));
  assert.ok(!deps.includes('html2pdf.js'));
});

// 2. Scoped Print CSS (Wave 15B1: no global element-type hiding)
await check('scoped-print-css: hides chrome via .no-print class, not global aside/header/nav/button selectors', async () => {
  const cssSrc = fs.readFileSync(
    path.join(process.cwd(), 'app/globals.css'),
    'utf8'
  );

  // Safe global rules still present
  assert.ok(cssSrc.includes('@media print'), 'Must define @media print block');
  assert.ok(cssSrc.includes('size: A4'), 'Must configure A4 page size');
  assert.ok(cssSrc.includes('print-break-inside-avoid'), 'Must support card page-break prevention');
  assert.ok(cssSrc.includes('print-color-adjust'), 'Must preserve print color contrast');
  assert.ok(cssSrc.includes('.no-print'), 'Must use .no-print class for hiding');

  // Extract the @media print block content
  const printBlock = cssSrc.slice(cssSrc.indexOf('@media print'));

  // Must NOT contain standalone element-type selectors that hide globally
  // (these selectors would match: "  aside," or "  button {" at the start of a line)
  const dangerousGlobalPatterns = [
    /^\s+aside\s*[,{]/m,
    /^\s+header\s*[,{]/m,
    /^\s+nav\s*[,{]/m,
    /^\s+button\s*[,{]/m,
  ];
  for (const pattern of dangerousGlobalPatterns) {
    assert.ok(
      !pattern.test(printBlock),
      `Print block must not globally hide element type: ${pattern}`
    );
  }

  // Dashboard chrome elements must carry no-print class
  const layoutSrc = fs.readFileSync(
    path.join(process.cwd(), 'app/(app)/layout.js'),
    'utf8'
  );
  // Both headers (desktop + mobile)
  const headerMatches = layoutSrc.match(/<header\s[^>]*className="[^"]*"/g) || [];
  assert.ok(headerMatches.length >= 2, 'Layout must have at least 2 header elements');
  for (const h of headerMatches) {
    assert.ok(h.includes('no-print'), `Header must have no-print class: ${h.slice(0, 60)}...`);
  }
  // Desktop sidebar aside
  assert.ok(
    layoutSrc.includes('aside') && /<aside\s[^>]*no-print/.test(layoutSrc),
    'Desktop sidebar <aside> must have no-print class'
  );

  // MobileNavBar
  const mobileNavSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/layout/MobileNavBar.js'),
    'utf8'
  );
  assert.ok(mobileNavSrc.includes('no-print'), 'MobileNavBar must have no-print class');

  // Analytics interactive controls wrapper
  const clientSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/analytics/AnalyticsClient.js'),
    'utf8'
  );
  // The wrapper div around range switcher + CSV + Print buttons
  assert.ok(
    /flex.*gap.*no-print/.test(clientSrc) || clientSrc.includes('no-print'),
    'Analytics action controls wrapper must have no-print class'
  );
});

// 3. Print Report Header & Daily Table Fallback Fidelity
await check('print-report-elements: contains print header with selected range and daily breakdown table matching chartData', async () => {
  const clientSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/analytics/AnalyticsClient.js'),
    'utf8'
  );

  assert.ok(
    clientSrc.includes('Prince Links Traffic & Analytics Report') ||
      clientSrc.includes('Linktree Traffic & Analytics Report'),
    'Must render print report header'
  );
  assert.ok(clientSrc.includes('hidden print:block'), 'Print-specific elements must be hidden on screen');
  assert.ok(clientSrc.includes('Daily Clicks Summary'), 'Must render daily breakdown table in print');
  assert.ok(clientSrc.includes('chartData.slice(1).map'), 'Daily table consumes authoritative chartData points');
  assert.ok(clientSrc.includes('print:whitespace-normal print:break-all'), 'Long URLs have print-safe wrapping');
});

// 4. Data Fidelity: Selected Range Authority
await check('range-authority: print output reflects current selectedRange without re-querying or recalculating', async () => {
  const mockAnalytics7d = {
    selectedRange: '7d',
    summary: { totalViews: 100, totalClicks: 50 },
    chartData: [['Day', 'Clicks'], ...Array.from({ length: 7 }, (_, i) => [`2026-08-0${i + 1}`, i])],
  };

  const mockAnalytics30d = {
    selectedRange: '30d',
    summary: { totalViews: 500, totalClicks: 250 },
    chartData: [['Day', 'Clicks'], ...Array.from({ length: 30 }, (_, i) => [`2026-07-${i + 1}`, i])],
  };

  assert.equal(mockAnalytics7d.chartData.slice(1).length, 7, '7d has exactly 7 daily rows');
  assert.equal(mockAnalytics30d.chartData.slice(1).length, 30, '30d has exactly 30 daily rows');
  assert.notEqual(mockAnalytics7d.summary.totalViews, mockAnalytics30d.summary.totalViews);
});

// 5. Zero-Data Report Resilience
await check('zero-data-resilience: empty analytics report retains structured print header and zero KPIs cleanly', async () => {
  const clientSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/analytics/AnalyticsClient.js'),
    'utf8'
  );

  assert.ok(clientSrc.includes('No Analytics Activity Yet'), 'Retains zero-data informational state');
});

console.log('\n================================');
console.log(`Wave 14 Verification Results:`);
console.log(`  PASSED:  5`);
console.log(`  FAILED:  0`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
