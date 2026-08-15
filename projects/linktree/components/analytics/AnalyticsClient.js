'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faMousePointer,
  faLink,
  faGlobe,
  faMobileAlt,
  faDesktop,
  faTabletAlt,
  faQuestionCircle,
  faExternalLinkAlt,
  faCopy,
  faCheck,
  faChartLine,
  faCalendarAlt,
  faArrowTrendUp,
  faBullseye,
  faDownload,
  faPrint,
  faLock,
} from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { toast } from 'react-toastify';
import SectionBox from '../layout/SectionBox';
import AnalyticsAreaChart from './AnalyticsAreaChart';
import { buildAnalyticsCsv, buildAnalyticsCsvFilename } from '@/lib/analyticsCsv';
import { getAnalyticsRangeConfig } from '@/lib/analyticsRanges';

const deviceIcons = {
  mobile: faMobileAlt,
  desktop: faDesktop,
  tablet: faTabletAlt,
  other: faQuestionCircle,
  Unknown: faQuestionCircle,
};

const AnalyticsClient = ({ analytics, publicUrl, uri, canUseExtendedAnalytics = false, isRestricted = false }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const selectedRange = analytics.selectedRange || '7d';

  const handleExportCsv = () => {
    try {
      const csvContent = buildAnalyticsCsv(analytics);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', buildAnalyticsCsvFilename(uri, selectedRange));
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Analytics CSV exported');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleRangeChange = (range) => {
    if (range === selectedRange) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    router.push(`/dashboard/analytics?${params.toString()}`);
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Profile URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const { summary, chartData, deviceBreakdown, referrerBreakdown, rankedLinks, hasData, windowStart, windowEnd } = analytics;

  // Format date range text for header
  const formatDateRange = () => {
    try {
      const start = new Date(windowStart);
      const end = new Date(windowEnd);
      // windowEnd is exclusive (tomorrow 00:00), so subtract 1 day for inclusive label
      end.setDate(end.getDate() - 1);
      const startYear = start.getUTCFullYear();
      const endYear = end.getUTCFullYear();
      const startStr = start.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: startYear !== endYear ? 'numeric' : undefined,
      });
      const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      return `${startStr} – ${endStr}`;
    } catch {
      return getAnalyticsRangeConfig(selectedRange).printLabel;
    }
  };

  // Calculate CTR (Click-Through Rate)
  const ctr = summary.totalViews > 0
    ? ((summary.totalClicks / summary.totalViews) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* ═══ Header & Range Filter Bar ═══ */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200/90 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0">
              <FontAwesomeIcon icon={faChartLine} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Traffic & Analytics</h1>
                {uri && (
                  <span className="hidden sm:inline-flex items-center text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                    @{uri}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">
                Track live page views, link clicks, device types, and top referral channels.
              </p>
            </div>
          </div>

          {/* Right Action Controls: Date Range Toggle & Export CSV */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap sm:flex-nowrap no-print">
            {/* Formatted Date Range Pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-600">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-slate-400 text-xs" />
              <span>{formatDateRange()}</span>
            </div>

            {/* Segmented Range Switcher */}
            <div
              role="group"
              aria-label="Analytics date range filter"
              className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner flex-wrap sm:flex-nowrap"
            >
              {/* 7 Days */}
              <button
                type="button"
                onClick={() => handleRangeChange('7d')}
                aria-pressed={selectedRange === '7d'}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRange === '7d'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                7 Days
              </button>

              {/* 30 Days */}
              <button
                type="button"
                onClick={() => handleRangeChange('30d')}
                aria-pressed={selectedRange === '30d'}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRange === '30d'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                30 Days
              </button>

              {/* 90 Days */}
              <button
                type="button"
                onClick={() => handleRangeChange('90d')}
                aria-pressed={selectedRange === '90d'}
                disabled={!canUseExtendedAnalytics}
                title={!canUseExtendedAnalytics ? 'Pro feature: Upgrade to unlock 90-day analytics' : '90 Days'}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedRange === '90d'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : canUseExtendedAnalytics
                    ? 'text-slate-600 hover:text-slate-900 cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed opacity-75'
                }`}
              >
                <span>90 Days</span>
                {!canUseExtendedAnalytics && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    <FontAwesomeIcon icon={faLock} className="text-[8px]" />
                    <span>PRO</span>
                  </span>
                )}
              </button>

              {/* 1 Year */}
              <button
                type="button"
                onClick={() => handleRangeChange('365d')}
                aria-pressed={selectedRange === '365d'}
                disabled={!canUseExtendedAnalytics}
                title={!canUseExtendedAnalytics ? 'Pro feature: Upgrade to unlock 1-year analytics' : '1 Year'}
                className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  selectedRange === '365d'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : canUseExtendedAnalytics
                    ? 'text-slate-600 hover:text-slate-900 cursor-pointer'
                    : 'text-slate-400 cursor-not-allowed opacity-75'
                }`}
              >
                <span>1 Year</span>
                {!canUseExtendedAnalytics && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    <FontAwesomeIcon icon={faLock} className="text-[8px]" />
                    <span>PRO</span>
                  </span>
                )}
              </button>
            </div>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              aria-label="Export analytics report as CSV"
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 rounded-2xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none shrink-0"
            >
              <FontAwesomeIcon icon={faDownload} className="text-slate-500 text-xs" />
              <span>Export CSV</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              aria-label="Print or save analytics report as PDF"
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[40px] focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none shrink-0"
            >
              <FontAwesomeIcon icon={faPrint} className="text-white text-xs" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* ═══ Optional Notice Banner for Manipulated Restricted Range ═══ */}
        {isRestricted && (
          <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 no-print">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faLock} className="text-amber-600 text-sm" />
              <span>
                <strong>Extended analytics is available with Pro.</strong> Showing the last 30 days of traffic instead.
              </span>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1 font-bold text-amber-800 hover:text-amber-950 underline self-start sm:self-auto shrink-0"
            >
              <span>View Pro Plans &rarr;</span>
            </Link>
          </div>
        )}

        {/* ═══ Dedicated Print-Only Report Header ═══ */}
        <div className="hidden print:block mb-4 pb-4 border-b border-slate-300">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Prince Links Traffic & Analytics Report</h1>
              {uri && (
                <p className="text-xs font-mono text-slate-600 mt-0.5">
                  @{uri} {publicUrl ? `(${publicUrl})` : ''}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-slate-600">
              <p className="font-semibold text-slate-900">
                {getAnalyticsRangeConfig(selectedRange).printLabel}
              </p>
              <p>{formatDateRange()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Generated: {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* ═══ Top 4 KPI Summary Cards Grid ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Page Views */}
          <div className="bg-slate-50/80 hover:bg-slate-50 p-5 rounded-2xl border border-slate-200/80 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Page Views
              </span>
              <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xs shadow-2xs">
                <FontAwesomeIcon icon={faEye} />
              </span>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {summary.totalViews.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 mt-1">
                <FontAwesomeIcon icon={faArrowTrendUp} className="text-[10px]" />
                <span>Live profile traffic</span>
              </div>
            </div>
          </div>

          {/* Card 2: Link Clicks */}
          <div className="bg-slate-50/80 hover:bg-slate-50 p-5 rounded-2xl border border-slate-200/80 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Link Clicks
              </span>
              <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shadow-2xs">
                <FontAwesomeIcon icon={faMousePointer} />
              </span>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                {summary.totalClicks.toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 mt-1">
                <FontAwesomeIcon icon={faBullseye} className="text-[10px]" />
                <span>{ctr}% click-through rate</span>
              </div>
            </div>
          </div>

          {/* Card 3: Top Link */}
          <div className="bg-slate-50/80 hover:bg-slate-50 p-5 rounded-2xl border border-slate-200/80 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Top Link
              </span>
              <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs shadow-2xs">
                <FontAwesomeIcon icon={faLink} />
              </span>
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 truncate" title={summary.topLink}>
                {summary.topLink}
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-1 truncate">
                Most engaged destination
              </div>
            </div>
          </div>

          {/* Card 4: Top Referrer */}
          <div className="bg-slate-50/80 hover:bg-slate-50 p-5 rounded-2xl border border-slate-200/80 transition-all flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Top Referrer
              </span>
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xs shadow-2xs">
                <FontAwesomeIcon icon={faGlobe} />
              </span>
            </div>
            <div>
              <div className="text-base font-extrabold text-slate-900 truncate" title={summary.topReferrer}>
                {summary.topReferrer}
              </div>
              <div className="text-[11px] font-medium text-slate-500 mt-1 truncate">
                Primary audience source
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Main Analytics Body ═══ */}
      {!hasData ? (
        <SectionBox>
          <div className="text-center py-14 px-4 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <FontAwesomeIcon icon={faChartLine} className="text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">No Analytics Activity Yet</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                We haven&apos;t recorded any visitors or link clicks for this{' '}
                {getAnalyticsRangeConfig(selectedRange).label.toLowerCase()} window. Share your public profile link
                to start gathering real-time performance insights!
              </p>
            </div>

            {publicUrl && (
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                  <span>{copied ? 'Copied!' : 'Copy Profile Link'}</span>
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 hover:bg-slate-100 active:scale-95 text-slate-700 rounded-xl text-xs font-bold transition-all bg-white"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  <span>Visit Profile</span>
                </a>
              </div>
            )}
          </div>
        </SectionBox>
      ) : (
        <>
          {/* Continuous Daily Clicks Performance Area Chart */}
          <SectionBox>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Link Clicks: Daily Performance
                </h2>
                <p className="text-xs text-slate-500">
                  Continuous timeline of link click interactions across {formatDateRange()}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
                <span>Total: {summary.totalClicks} clicks</span>
              </div>
            </div>

            <div className="pt-2">
              <AnalyticsAreaChart data={chartData} range={selectedRange} />
            </div>

            {/* Print-Only Daily Breakdown Table */}
            {chartData.length > 1 && (
              <div className="hidden print:block mt-4 pt-3 border-t border-slate-300">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Daily Clicks Summary ({getAnalyticsRangeConfig(selectedRange).label})
                </h3>
                <div className="border border-slate-300 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 border-b border-slate-300 font-semibold text-slate-700">
                      <tr>
                        <th className="py-1.5 px-3">Date (UTC)</th>
                        <th className="py-1.5 px-3 text-right">Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {chartData.slice(1).map(([date, clicks]) => (
                        <tr key={date}>
                          <td className="py-1 px-3 font-mono">{date}</td>
                          <td className="py-1 px-3 text-right font-mono font-semibold">{clicks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SectionBox>

          {/* ═══ 2-Column Audience Intelligence Grid ═══ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Breakdown */}
            <SectionBox>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Device Breakdown</h2>
                  <p className="text-xs text-slate-500">Traffic split by visitor device platform</p>
                </div>
              </div>

              <div className="space-y-4">
                {deviceBreakdown.map((item) => {
                  const icon = deviceIcons[item.key] || faQuestionCircle;
                  return (
                    <div key={item.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span className="flex items-center gap-2.5">
                          <FontAwesomeIcon icon={icon} className="text-slate-400 w-3.5" />
                          <span>{item.name}</span>
                        </span>
                        <span className="text-slate-600 font-mono font-bold">
                          {item.count} <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(2, item.percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBox>

            {/* Referrer Breakdown */}
            <SectionBox>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Top Referral Channels</h2>
                  <p className="text-xs text-slate-500">Domains bringing audience to your links</p>
                </div>
              </div>

              <div className="space-y-4">
                {referrerBreakdown.slice(0, 6).map((item) => (
                  <div key={item.domain} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                      <span className="flex items-center gap-2.5 truncate max-w-[220px]" title={item.name}>
                        <FontAwesomeIcon icon={faGlobe} className="text-slate-400 w-3.5 shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="text-slate-600 font-mono font-bold shrink-0">
                        {item.count} <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, item.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionBox>
          </div>

          {/* ═══ Link Performance & Rankings Table ═══ */}
          <SectionBox className="print:break-inside-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 print:mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Link Performance Ranking</h2>
                <p className="text-xs text-slate-500">
                  Detailed click conversion performance for all links in your profile
                </p>
              </div>
            </div>

            {rankedLinks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No active links found on your profile.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 print:divide-slate-200">
                {rankedLinks.map((link) => (
                  <div
                    key={link.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors rounded-2xl px-3 print:break-inside-avoid print:py-2"
                  >
                    {/* Rank Badge + Link Title & URL */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                          link.rank === 1
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : link.rank === 2
                            ? 'bg-slate-200 text-slate-800 border border-slate-300'
                            : link.rank === 3
                            ? 'bg-orange-100 text-orange-900 border border-orange-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        #{link.rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{link.title}</h4>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-600 text-xs transition print:hidden"
                            title="Open destination URL"
                          >
                            <FontAwesomeIcon icon={faExternalLinkAlt} />
                          </a>
                        </div>
                        <p className="text-xs text-slate-400 font-mono truncate print:whitespace-normal print:break-all mt-0.5">{link.url}</p>
                      </div>
                    </div>

                    {/* Progress Bar & Clicks Count */}
                    <div className="flex items-center gap-6 justify-between sm:justify-end shrink-0">
                      <div className="w-32 hidden md:block">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(2, link.percentage)}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-right shrink-0 min-w-[80px]">
                        <div className="text-sm font-extrabold text-slate-900 font-mono">
                          {link.clicks.toLocaleString()} <span className="text-[11px] font-normal text-slate-400">clicks</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          {link.percentage}% share
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionBox>
        </>
      )}
    </div>
  );
};

export default AnalyticsClient;
