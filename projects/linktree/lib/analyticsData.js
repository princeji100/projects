import Event from '../models/Event.js';
import { format, addDays, isBefore, isEqual } from 'date-fns';

/**
 * Server-authoritative analytics data aggregation engine.
 * Computes metrics, continuous daily charts, breakdowns, and deterministic link rankings
 * over a strictly derived 7-day or 30-day window.
 *
 * @param {string} pageUri
 * @param {Array} links
 * @param {string | undefined} rangeParam - '7d' | '30d'
 * @returns {Promise<Object>}
 */
export async function getAnalyticsData(pageUri, links = [], rangeParam = '7d') {
  const selectedRange = rangeParam === '30d' ? '30d' : '7d';
  const rangeDays = selectedRange === '30d' ? 30 : 7;

  // Derive exact window bounds
  const now = new Date();
  const windowEnd = new Date(now);
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - (rangeDays - 1));
  windowStart.setHours(0, 0, 0, 0);

  // Fetch events for this page within window
  const events = await Event.find({
    page: pageUri,
    createdAt: { $gte: windowStart, $lte: windowEnd },
  }).lean();

  const viewEvents = events.filter((e) => e.type === 'view');
  const clickEvents = events.filter((e) => e.type === 'click');

  const totalViews = viewEvents.length;
  const totalClicks = clickEvents.length;
  const hasData = totalViews > 0 || totalClicks > 0;

  // 1. Continuous Daily Click Trend Chart Data
  const dailyClicksMap = {};
  for (const c of clickEvents) {
    if (c.createdAt) {
      const dateKey = format(new Date(c.createdAt), 'yyyy-MM-dd');
      dailyClicksMap[dateKey] = (dailyClicksMap[dateKey] || 0) + 1;
    }
  }

  const chartData = [['Day', 'Clicks']];
  for (
    let d = new Date(windowStart);
    isBefore(d, windowEnd) || isEqual(d, windowEnd);
    d = addDays(d, 1)
  ) {
    const formattedDate = format(d, 'yyyy-MM-dd');
    chartData.push([formattedDate, dailyClicksMap[formattedDate] || 0]);
  }

  // 2. Device Breakdown (grouping historical records with missing device into 'Unknown')
  const deviceCounts = {
    mobile: 0,
    desktop: 0,
    tablet: 0,
    other: 0,
    Unknown: 0,
  };

  for (const e of events) {
    if (!e.device) {
      deviceCounts.Unknown++;
    } else if (deviceCounts[e.device] !== undefined) {
      deviceCounts[e.device]++;
    } else {
      deviceCounts.other++;
    }
  }

  const totalEvents = events.length;
  const deviceBreakdown = Object.entries(deviceCounts)
    .filter(([, count]) => count > 0 || totalEvents === 0)
    .map(([device, count]) => ({
      name: device.charAt(0).toUpperCase() + device.slice(1),
      key: device,
      count,
      percentage: totalEvents > 0 ? Number(((count / totalEvents) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 3. Referrer Breakdown (grouping historical records with missing referrer into 'Unknown')
  const referrerCounts = {};
  for (const e of events) {
    const ref = !e.referrer ? 'Unknown' : e.referrer;
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
  }

  const referrerBreakdown = Object.entries(referrerCounts)
    .map(([domain, count]) => ({
      domain,
      name: domain === 'direct' ? 'Direct / Bookmarks' : domain,
      count,
      percentage: totalEvents > 0 ? Number(((count / totalEvents) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 4. Deterministic Link Ranking (ANA-03)
  const clickCountByUrl = {};
  for (const c of clickEvents) {
    if (c.url) {
      clickCountByUrl[c.url] = (clickCountByUrl[c.url] || 0) + 1;
    }
  }

  const mappedLinks = (links || []).map((link, originalIndex) => {
    const url = link.url || '';
    const clicks = clickCountByUrl[url] || 0;
    const linkId = link._id?.toString() || link.id?.toString() || `${url}-${originalIndex}`;
    return {
      id: linkId,
      originalIndex,
      title: link.title || 'Untitled Link',
      subtitle: link.subtitle || '',
      icon: link.icon || '',
      url,
      clicks,
    };
  });

  const totalRankedClicks = mappedLinks.reduce((sum, l) => sum + l.clicks, 0);

  // Deterministic sorting: clicks descending, then originalIndex ascending
  mappedLinks.sort((a, b) => {
    if (b.clicks !== a.clicks) {
      return b.clicks - a.clicks;
    }
    return a.originalIndex - b.originalIndex;
  });

  const rankedLinks = mappedLinks.map((l, idx) => ({
    ...l,
    rank: idx + 1,
    percentage: totalRankedClicks > 0 ? Number(((l.clicks / totalRankedClicks) * 100).toFixed(1)) : 0,
  }));

  // Top summary metrics
  const topLink = rankedLinks.find((l) => l.clicks > 0)?.title || (rankedLinks[0]?.title ?? 'None');
  const topReferrer = referrerBreakdown[0]?.name || 'None';

  return {
    selectedRange,
    rangeDays,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
    hasData,
    summary: {
      totalViews,
      totalClicks,
      topLink,
      topReferrer,
    },
    chartData,
    deviceBreakdown,
    referrerBreakdown,
    rankedLinks,
  };
}
