import Event from '../models/Event.js';

/**
 * Server-authoritative analytics data aggregation engine with explicit UTC day boundaries
 * and strict separation between view and click event types.
 *
 * @param {string} pageUri
 * @param {Array} links
 * @param {string | undefined} rangeParam - '7d' | '30d' (defaults safely to '7d')
 * @param {Date | string | undefined} referenceDate - Optional reference date (defaults to current time)
 * @returns {Promise<Object>}
 */
export async function getAnalyticsData(pageUri, links = [], rangeParam = '7d', referenceDate = null) {
  // 1. Strict range validation with safe fallback (ANA-02)
  const selectedRange = rangeParam === '30d' ? '30d' : '7d';
  const rangeDays = selectedRange === '30d' ? 30 : 7;

  // 2. Exact UTC day-boundary semantics: half-open window [windowStart, windowEnd)
  const now = referenceDate ? new Date(referenceDate) : new Date();
  
  // UTC midnight (rangeDays - 1) days before today
  const windowStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - (rangeDays - 1),
      0,
      0,
      0,
      0
    )
  );

  // Tomorrow's UTC midnight: windowEnd is exclusive
  const windowEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );

  // 3. Fetch all events for this page within the half-open window [windowStart, windowEnd)
  const events = await Event.find({
    page: pageUri,
    createdAt: { $gte: windowStart, $lt: windowEnd },
  }).lean();

  // 4. Strict separation between view and click events
  const viewEvents = events.filter((e) => e.type === 'view');
  const clickEvents = events.filter((e) => e.type === 'click');

  const totalViews = viewEvents.length;
  const totalClicks = clickEvents.length;
  const hasData = totalViews > 0 || totalClicks > 0;

  // 5. Continuous Daily Click Timeline in UTC (never mixing views into clicks)
  const dailyClicksMap = {};
  for (const c of clickEvents) {
    if (c.createdAt) {
      const utcDateKey = new Date(c.createdAt).toISOString().slice(0, 10);
      dailyClicksMap[utcDateKey] = (dailyClicksMap[utcDateKey] || 0) + 1;
    }
  }

  const chartData = [['Day', 'Clicks']];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const dayDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - i,
        0,
        0,
        0,
        0
      )
    );
    const dateKey = dayDate.toISOString().slice(0, 10);
    chartData.push([dateKey, dailyClicksMap[dateKey] || 0]);
  }

  // 6. Device Breakdown for Clicks (historical missing = 'Unknown')
  const deviceCounts = {
    mobile: 0,
    desktop: 0,
    tablet: 0,
    other: 0,
    Unknown: 0,
  };

  for (const c of clickEvents) {
    if (!c.device) {
      deviceCounts.Unknown++;
    } else if (deviceCounts[c.device] !== undefined) {
      deviceCounts[c.device]++;
    } else {
      deviceCounts.other++;
    }
  }

  const deviceBreakdown = Object.entries(deviceCounts)
    .filter(([, count]) => count > 0 || totalClicks === 0)
    .map(([device, count]) => ({
      name: device.charAt(0).toUpperCase() + device.slice(1),
      key: device,
      count,
      percentage: totalClicks > 0 ? Number(((count / totalClicks) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 7. Referrer Breakdown for Clicks (historical missing = 'Unknown', same-site = 'internal', missing = 'direct')
  const referrerCounts = {};
  for (const c of clickEvents) {
    const ref = !c.referrer ? 'Unknown' : c.referrer;
    referrerCounts[ref] = (referrerCounts[ref] || 0) + 1;
  }

  const referrerLabelMap = {
    direct: 'Direct / Bookmarks',
    internal: 'Internal / Same-Site',
    Unknown: 'Unknown (Historical)',
  };

  const referrerBreakdown = Object.entries(referrerCounts)
    .map(([domain, count]) => ({
      domain,
      name: referrerLabelMap[domain] || domain,
      count,
      percentage: totalClicks > 0 ? Number(((count / totalClicks) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 8. Deterministic Link Rankings for Clicks (ANA-03)
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

  // Deterministic sorting: clicks descending, tie-breaker: original link index ascending
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

  // 9. Summary KPI Metrics
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
