/**
 * Analytics CSV Export Engine
 * Generates spreadsheet-safe, UTF-8 encoded, formula-injection-neutralized CSV reports
 * using the authoritative server-aggregated analytics dataset.
 */

import { getAnalyticsRangeConfig } from './analyticsRanges.js';

const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Escapes a single cell for CSV formatting with formula-injection neutralization.
 *
 * @param {any} value
 * @returns {string}
 */
export function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  // Pure numbers and booleans do not require formula neutralization
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  let str = String(value);

  // Formula injection defense: If text starts with dangerous formula chars, prefix with single quote
  // (Unless it is a plain numeric string like "123")
  const isPlainNumber = /^-?\d+(\.\d+)?$/.test(str.trim());
  if (!isPlainNumber && str.length > 0 && FORMULA_PREFIXES.includes(str.charAt(0))) {
    str = `'${str}`;
  }

  // Standard CSV escaping: quote if contains comma, quote, newline, or carriage return
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r') || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generates a safe, lowercase, standard analytics CSV filename.
 *
 * @param {string | undefined} uri
 * @param {string} selectedRange
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function buildAnalyticsCsvFilename(uri, selectedRange = '7d', date = new Date()) {
  const rangeConfig = getAnalyticsRangeConfig(selectedRange);
  const range = rangeConfig.id;
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  if (uri && typeof uri === 'string' && uri.trim()) {
    const cleanUri = uri.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return `linktree-${cleanUri}-analytics-${range}-${dateStr}.csv`;
  }

  return `linktree-analytics-${range}-${dateStr}.csv`;
}

/**
 * Builds the complete human-readable, multi-section CSV string with UTF-8 BOM and CRLF line endings.
 *
 * @param {Object} analytics - Authoritative server analytics dataset
 * @param {Object} [options={}]
 * @returns {string}
 */
export function buildAnalyticsCsv(analytics, options = {}) {
  if (!analytics || typeof analytics !== 'object') {
    return '';
  }

  const CRLF = '\r\n';
  const BOM = '\uFEFF';
  const lines = [];

  const {
    selectedRange = '7d',
    windowStart = '',
    windowEnd = '',
    summary = {},
    chartData = [],
    deviceBreakdown = [],
    referrerBreakdown = [],
    rankedLinks = [],
  } = analytics;

  const nowIso = options.generatedAt || new Date().toISOString();
  const rangeLabel = getAnalyticsRangeConfig(selectedRange).printLabel;

  // 1. Report Metadata Section
  lines.push([escapeCsvCell('Report'), escapeCsvCell('Prince Links Traffic & Analytics Report')].join(','));
  lines.push([escapeCsvCell('Selected Range'), escapeCsvCell(rangeLabel)].join(','));
  if (windowStart) {
    lines.push([escapeCsvCell('Window Start UTC'), escapeCsvCell(windowStart)].join(','));
  }
  if (windowEnd) {
    lines.push([escapeCsvCell('Window End UTC'), escapeCsvCell(windowEnd)].join(','));
  }
  lines.push([escapeCsvCell('Generated At UTC'), escapeCsvCell(nowIso)].join(','));
  lines.push(''); // Empty line separator

  // 2. Summary Section
  lines.push([escapeCsvCell('Summary Metric'), escapeCsvCell('Value')].join(','));
  lines.push([escapeCsvCell('Total Views'), escapeCsvCell(summary.totalViews || 0)].join(','));
  lines.push([escapeCsvCell('Total Clicks'), escapeCsvCell(summary.totalClicks || 0)].join(','));
  lines.push([escapeCsvCell('Top Link'), escapeCsvCell(summary.topLink || 'None')].join(','));
  lines.push([escapeCsvCell('Top Referrer'), escapeCsvCell(summary.topReferrer || 'None')].join(','));
  lines.push('');

  // 3. Daily Clicks Section (continuous calendar timeline)
  lines.push([escapeCsvCell('Date UTC'), escapeCsvCell('Clicks')].join(','));
  const dailyRows = Array.isArray(chartData) && chartData.length > 1 ? chartData.slice(1) : [];
  for (const [date, clicks] of dailyRows) {
    lines.push([escapeCsvCell(date), escapeCsvCell(clicks || 0)].join(','));
  }
  lines.push('');

  // 4. Device Breakdown Section
  lines.push([escapeCsvCell('Device'), escapeCsvCell('Clicks'), escapeCsvCell('Share %')].join(','));
  for (const dev of deviceBreakdown || []) {
    lines.push([
      escapeCsvCell(dev.name || dev.key || 'Other'),
      escapeCsvCell(dev.count || 0),
      escapeCsvCell(`${dev.percentage || 0}%`),
    ].join(','));
  }
  lines.push('');

  // 5. Referrer Breakdown Section
  lines.push([escapeCsvCell('Referrer'), escapeCsvCell('Clicks'), escapeCsvCell('Share %')].join(','));
  for (const ref of referrerBreakdown || []) {
    lines.push([
      escapeCsvCell(ref.name || ref.domain || 'Direct / Bookmarks'),
      escapeCsvCell(ref.count || 0),
      escapeCsvCell(`${ref.percentage || 0}%`),
    ].join(','));
  }
  lines.push('');

  // 6. Link Performance Section (authoritative deterministic ranking)
  lines.push([
    escapeCsvCell('Rank'),
    escapeCsvCell('Title'),
    escapeCsvCell('URL'),
    escapeCsvCell('Clicks'),
    escapeCsvCell('Share %'),
  ].join(','));

  for (const link of rankedLinks || []) {
    lines.push([
      escapeCsvCell(link.rank || 0),
      escapeCsvCell(link.title || 'Untitled Link'),
      escapeCsvCell(link.url || ''),
      escapeCsvCell(link.clicks || 0),
      escapeCsvCell(`${link.percentage || 0}%`),
    ].join(','));
  }

  return BOM + lines.join(CRLF) + CRLF;
}
