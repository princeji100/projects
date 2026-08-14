'use client';

import { useRouter, useSearchParams } from 'next/navigation';
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
} from '@fortawesome/free-solid-svg-icons';
import { useState } from 'react';
import { toast } from 'react-toastify';
import SectionBox from '../layout/SectionBox';
import Graf from '../Graf';

const deviceIcons = {
  mobile: faMobileAlt,
  desktop: faDesktop,
  tablet: faTabletAlt,
  other: faQuestionCircle,
  Unknown: faQuestionCircle,
};

const AnalyticsClient = ({ analytics, publicUrl, uri }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const selectedRange = analytics.selectedRange || '7d';

  const handleRangeChange = (range) => {
    if (range === selectedRange) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    router.push(`/account/analytics?${params.toString()}`);
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Profile URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const { summary, chartData, deviceBreakdown, referrerBreakdown, rankedLinks, hasData } = analytics;

  return (
    <div className="space-y-6">
      {/* Header & Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Analytics</h1>
          <p className="text-slate-600 text-sm mt-0.5">
            Monitor traffic performance, referrer sources, and link engagement
          </p>
        </div>

        {/* Segmented Range Toggle (ANA-02) */}
        <div 
          role="group" 
          aria-label="Analytics date range filter" 
          className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => handleRangeChange('7d')}
            aria-pressed={selectedRange === '7d'}
            className={`flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
              selectedRange === '7d'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faCalendarAlt} className="text-[11px]" />
            <span>7 Days</span>
          </button>
          <button
            type="button"
            onClick={() => handleRangeChange('30d')}
            aria-pressed={selectedRange === '30d'}
            className={`flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-lg text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
              selectedRange === '30d'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FontAwesomeIcon icon={faCalendarAlt} className="text-[11px]" />
            <span>30 Days</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faEye} className="text-xl" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-800">{summary.totalViews.toLocaleString()}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Page Views</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faMousePointer} className="text-xl" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-bold text-slate-800">{summary.totalClicks.toLocaleString()}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Link Clicks</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faLink} className="text-xl" />
          </div>
          <div className="min-w-0 truncate">
            <div className="text-sm font-bold text-slate-800 truncate" title={summary.topLink}>
              {summary.topLink}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top Link</div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faGlobe} className="text-xl" />
          </div>
          <div className="min-w-0 truncate">
            <div className="text-sm font-bold text-slate-800 truncate" title={summary.topReferrer}>
              {summary.topReferrer}
            </div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Top Referrer</div>
          </div>
        </div>
      </div>

      {/* Empty State Card (ANA-04) */}
      {!hasData ? (
        <SectionBox>
          <div className="text-center py-12 px-4 max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <FontAwesomeIcon icon={faChartLine} className="text-2xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">No Analytics Activity Yet</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                We haven&apos;t recorded any visits or link clicks for this {selectedRange === '30d' ? '30-day' : '7-day'} window.
                Share your public link to start gaining real-time traffic insights!
              </p>
            </div>

            {publicUrl && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                  <span>{copied ? 'Copied' : 'Copy Profile Link'}</span>
                </button>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium transition-all"
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
          {/* Continuous Daily Clicks Trend Chart */}
          <SectionBox>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                Click Trend ({selectedRange === '30d' ? 'Last 30 Days' : 'Last 7 Days'})
              </h2>
            </div>
            <Graf
              data={chartData}
              title={`Daily Clicks (${selectedRange === '30d' ? 'Last 30 Days' : 'Last 7 Days'})`}
            />
          </SectionBox>

          {/* Breakdown Sections: Devices & Referrers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Device Breakdown */}
            <SectionBox>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Device Breakdown</h2>
              </div>
              <div className="space-y-3">
                {deviceBreakdown.map((item) => {
                  const icon = deviceIcons[item.key] || faQuestionCircle;
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                        <span className="flex items-center gap-2">
                          <FontAwesomeIcon icon={icon} className="text-slate-400 w-3.5" />
                          <span>{item.name}</span>
                        </span>
                        <span className="text-slate-500 font-mono">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionBox>

            {/* Referrer Breakdown */}
            <SectionBox>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-800">Top Referrers</h2>
              </div>
              <div className="space-y-3">
                {referrerBreakdown.slice(0, 6).map((item) => (
                  <div key={item.domain} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span className="flex items-center gap-2 truncate max-w-[200px]" title={item.name}>
                        <FontAwesomeIcon icon={faGlobe} className="text-slate-400 w-3.5 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="text-slate-500 font-mono flex-shrink-0">
                        {item.count} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionBox>
          </div>

          {/* Top Performing Links Table (ANA-03) */}
          <SectionBox>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Link Performance Ranking</h2>
                <p className="text-xs text-slate-500">
                  Links ranked by total clicks recorded in the selected {selectedRange === '30d' ? '30-day' : '7-day'} window
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {rankedLinks.map((link) => (
                <div
                  key={link.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors rounded-lg px-2"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                        link.rank === 1
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : link.rank === 2
                          ? 'bg-slate-200 text-slate-700 border border-slate-300'
                          : link.rank === 3
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}
                    >
                      #{link.rank}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-semibold text-slate-800 text-sm truncate">{link.title}</h4>
                      <p className="text-xs text-slate-400 font-mono truncate">{link.url}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 justify-between sm:justify-end flex-shrink-0">
                    <div className="w-24 sm:w-32 hidden sm:block">
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${link.percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 min-w-[70px]">
                      <div className="text-sm font-bold text-slate-800 font-mono">
                        {link.clicks.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">
                        {link.percentage}% share
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionBox>
        </>
      )}
    </div>
  );
};

export default AnalyticsClient;
