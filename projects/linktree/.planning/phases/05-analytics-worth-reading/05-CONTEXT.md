# Phase 5: Analytics Worth Reading — Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 delivers actionable analytics for page owners: capturing server-side normalized device and referrer metadata, offering a 7-day vs 30-day time window toggle, ranking links by click volume, and handling historical events and empty states gracefully.

**In scope:**
- **ANA-01**: Click events capture server-side parsed device (`mobile | desktop | tablet | other`) and normalized referrer hostname (e.g. `instagram.com`, `twitter.com`, `direct`).
- **ANA-02**: Analytics dashboard provides 7-day and 30-day view toggles driven by a validated query parameter (`?range=7d` / `?range=30d`), defaulting to `7d`.
- **ANA-03**: Links ranked by click volume over the selected window with percentage share, deterministic tie-breakers, and 0-click links visible at the bottom.
- **ANA-04**: Dedicated breakdowns for Devices, Referrers, Continuous Daily Trend, and a clean illustrated empty state when 0 events exist in the window.
- Historical event compatibility: genuine absence of `device`/`referrer` fields on older records is reported in a distinct "Unknown" category rather than misrepresented as "Direct" or "Other".

**Out of scope:**
- Geographic breakdown / country maps (v2 / ANA-05).
- CSV export (v2 / ANA-06).
- Arbitrary custom date ranges.
- Exposing raw event records or unparsed User-Agent strings.

</domain>

<decisions>
## Implementation Decisions

### 1. Server-Side Device & Referrer Normalization (ANA-01)
- **D-01:** Centralized parser helper `lib/analyticsParser.js` parses incoming requests server-side.
- **D-02:** Device normalization: evaluates `User-Agent` header into stable categories: `'mobile' | 'desktop' | 'tablet' | 'other'`.
- **D-03:** Referrer normalization: extracts `Referer` header, strips protocol, path, port, query params, fragments, credentials, and leading `www.` prefix into a clean hostname (e.g., `'instagram.com'`, `'t.co' -> 'twitter.com' / 'x.com'`).
- **D-04:** Missing, malformed, privacy-stripped, or same-origin referrers are normalized to `'direct'`.
- **D-05:** Do not persist raw User-Agent or full referrer URLs to prevent storage bloat and privacy leakage.

### 2. Event Model Schema & Historical Event Compatibility
- **D-06:** Add optional fields `referrer: { type: String }` and `device: { type: String, enum: ['mobile', 'desktop', 'tablet', 'other'] }` to `EventSchema`.
- **D-07:** Do NOT assign schema defaults to historical records or run destructive migrations.
- **D-08:** Aggregations group missing historical `device` and `referrer` fields under a distinct `"Unknown"` category (using `$ifNull` / aggregation branching).

### 3. Server-Authoritative Time Window Toggle (ANA-02)
- **D-09:** `/account/analytics` accepts `?range=7d` or `?range=30d`, validating against `['7d', '30d']` and defaulting safely to `'7d'`.
- **D-10:** Client-side segmented toggle changes URL query parameter preserving history and bookmarkability.
- **D-11:** Server derives exact timestamp boundaries: `windowStart = startOfDay(subDays(now, rangeDays - 1))` and `windowEnd = endOfDay(now)`.
- **D-12:** All 4 dashboard sections (Daily Trend, Devices, Referrers, Top Links) derive from the *exact same* query window and click dataset.

### 4. Deterministic Link Ranking (ANA-03)
- **D-13:** Links are ranked by click count in the selected window descending.
- **D-14:** Deterministic tie-breaker: if click counts are equal, sort by original page link index or link ID.
- **D-15:** Show rank number (`#1`, `#2`, ...), link title, URL, clicks in window, and percentage share of total ranked-link clicks.
- **D-16:** Links with zero clicks in the window remain visible at the bottom with `0 clicks (0%)`.

### 5. Dashboard Sections & Empty State (ANA-04)
- **D-17:** Four visual dashboard sections:
  1. **Summary Metric Cards**: Total Page Views, Total Link Clicks, Top Performing Link, Top Referrer.
  2. **Daily Clicks Trend**: Continuous timeline chart covering all days in the window (filling 0-click days).
  3. **Breakdown Cards**: Device breakdown (Mobile, Desktop, Tablet, Other, Unknown) and Referrer breakdown (Direct, Social/Web domains, Unknown).
  4. **Top Performing Links**: Sorted ranking table with progress bars.
- **D-18:** Clean illustrated empty state when 0 events exist in the selected window, complete with profile link copy/visit actions.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` § Phase 5 (ANA-01..ANA-04)
- `models/Event.js` — Event model with `device` and `referrer` fields
- `lib/analyticsParser.js` — Server-side device and referrer normalization helper (new)
- `app/api/click/route.js` — Click ingestion endpoint capturing parsed metadata
- `app/(page)/[uri]/page.js` — View event recording capturing parsed metadata
- `app/(app)/account/analytics/page.js` — Server-rendered analytics dashboard with 7d/30d query param
- `components/analytics/AnalyticsClient.js` — Segmented range toggle and client visual components (new)
- `components/Graf.js` — Daily trend chart component

</canonical_refs>
