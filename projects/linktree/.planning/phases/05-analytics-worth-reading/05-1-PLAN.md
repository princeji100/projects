---
phase: 05-analytics-worth-reading
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/analyticsParser.js
  - lib/analyticsData.js
  - models/Event.js
  - app/api/click/route.js
  - app/(page)/[uri]/page.js
  - components/analytics/AnalyticsClient.js
  - components/Graf.js
  - app/(app)/account/analytics/page.js
autonomous: true
requirements:
  - ANA-01
  - ANA-02
  - ANA-03
  - ANA-04
must_haves:
  truths:
    - "Incoming clicks and views capture server-side normalized device ('mobile'|'desktop'|'tablet'|'other') and clean referrer hostname (or 'direct')."
    - "Historical events with missing device/referrer fields are aggregated into a distinct 'Unknown' category without errors."
    - "The analytics page supports validated 7-day and 30-day window toggles derived server-authoritatively."
    - "Links are ranked deterministically by click volume in the selected window, retaining 0-click links at the bottom."
    - "When zero events exist in the selected window, an illustrated empty state is rendered."
  artifacts:
    - path: "lib/analyticsParser.js"
      provides: "Device and referrer normalization helpers"
    - path: "lib/analyticsData.js"
      provides: "Server-authoritative analytics aggregation engine"
    - path: "components/analytics/AnalyticsClient.js"
      provides: "Segmented time-window toggle and breakdown UI cards"
---

<objective>
Implement server-side device/referrer parsing and capture, 7d/30d server-authoritative time window aggregation, deterministic link rankings, historical data compatibility, and empty-state dashboard rendering.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
@~/.gemini/antigravity/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/05-analytics-worth-reading/05-CONTEXT.md
@.planning/phases/05-analytics-worth-reading/05-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Server-Side Analytics Parser (ANA-01)</name>
  <files>lib/analyticsParser.js</files>
  <read_first>.planning/phases/05-analytics-worth-reading/05-CONTEXT.md</read_first>
  <action>
    Create `lib/analyticsParser.js` exporting:
    1. `parseDevice(userAgent)`: evaluates `User-Agent` string into `'mobile' | 'desktop' | 'tablet' | 'other'`.
    2. `normalizeReferrer(refererHeader, appUrl)`: parses `Referer` header into clean lowercase hostname (e.g. `'instagram.com'`, `'twitter.com'`), stripping protocol, path, port, credentials, and leading `www.`. Returns `'direct'` for empty, missing, invalid, or internal referrers.
  </action>
  <verify>
    <automated>test -f lib/analyticsParser.js</automated>
  </verify>
  <done>
    `lib/analyticsParser.js` provides centralized, deterministic parsing for devices and referrers.
  </done>
</task>

<task type="auto">
  <name>Task 2: Event Schema & Event Ingestion Metadata Capture (ANA-01)</name>
  <files>models/Event.js, app/api/click/route.js, app/(page)/[uri]/page.js</files>
  <read_first>models/Event.js, app/api/click/route.js, app/(page)/[uri]/page.js</read_first>
  <action>
    1. In `models/Event.js`:
       - Add optional fields `device: { type: String, enum: ['mobile', 'desktop', 'tablet', 'other'] }` and `referrer: { type: String }` to `EventSchema`.
    2. In `app/api/click/route.js`:
       - Extract `userAgent = req.headers.get('user-agent')` and `referer = req.headers.get('referer')`.
       - Persist normalized `device` and `referrer` on `Event.create({ type: 'click', url, page, device, referrer })`.
    3. In `app/(page)/[uri]/page.js`:
       - Extract headers from Next.js `headers()` and record normalized `device` and `referrer` on `Event.create({ type: 'view', url: uri, page: uri, device, referrer })`.
  </action>
  <verify>
    <automated>grep -q 'device' models/Event.js && grep -q 'analyticsParser' app/api/click/route.js</automated>
  </verify>
  <done>
    New view and click events persist normalized device and referrer metadata server-side.
  </done>
</task>

<task type="auto">
  <name>Task 3: Server-Side Analytics Aggregation Engine (ANA-02, ANA-03, ANA-04)</name>
  <files>lib/analyticsData.js</files>
  <read_first>lib/analyticsParser.js</read_first>
  <action>
    Create `lib/analyticsData.js` exporting:
    1. `getAnalyticsData(pageUri, links, rangeParam)`:
       - Validates `rangeParam` (`'7d'` vs `'30d'`, default `'7d'`).
       - Derives single timestamp window: `windowStart` and `windowEnd`.
       - Aggregates daily click trend filling in all calendar days in range with 0 if no clicks.
       - Aggregates device breakdown (grouping missing historical fields into `"Unknown"`).
       - Aggregates referrer breakdown (grouping missing historical fields into `"Unknown"`).
       - Ranks `links` by click count in the window descending with deterministic tie-breakers (by link index) and computes percentage share. Retains 0-click links at the bottom.
       - Computes summary metrics: total views, total clicks, top link, top referrer.
  </action>
  <verify>
    <automated>test -f lib/analyticsData.js</automated>
  </verify>
  <done>
    `lib/analyticsData.js` delivers unified, server-authoritative analytics aggregations.
  </done>
</task>

<task type="auto">
  <name>Task 4: Analytics Dashboard UI & Empty State (ANA-02, ANA-03, ANA-04)</name>
  <files>components/analytics/AnalyticsClient.js, components/Graf.js, app/(app)/account/analytics/page.js</files>
  <read_first>components/Graf.js, app/(app)/account/analytics/page.js</read_first>
  <action>
    1. In `components/analytics/AnalyticsClient.js`:
       - Create segmented 7d / 30d range toggle that updates URL query param `?range=7d` / `?range=30d`.
       - Render summary metric stat cards (Total Views, Total Clicks, Top Link, Top Referrer).
       - Render breakdown cards for Devices and Top Referrers with visual distribution bars.
       - Render ranked Top Performing Links table with progress bars and percentage shares.
       - Render clean illustrated empty state card when 0 events exist in the window with profile link copy/visit action.
    2. In `components/Graf.js`:
       - Update chart options to dynamically reflect the selected range ('Last 7 Days' / 'Last 30 Days') with smooth responsive rendering.
    3. In `app/(app)/account/analytics/page.js`:
       - Read dynamic query param `searchParams.range`.
       - Load data via `getAnalyticsData(page.uri, page.links, searchParams.range)`.
       - Render `<AnalyticsClient />` with aggregated payload.
  </action>
  <verify>
    <automated>test -f components/analytics/AnalyticsClient.js && grep -q 'AnalyticsClient' app/\(app\)/account/analytics/page.js</automated>
  </verify>
  <done>
    Analytics dashboard renders 7d/30d views, daily trends, device/referrer breakdowns, ranked links, and empty states.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Header Parser | Ingestion of raw User-Agent and Referer headers |
| Query Range | User supplied range query parameter |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-5-01 | Spoofing / Tampering | lib/analyticsParser.js | mitigate | Sanitize all header strings into safe enums and valid hostnames |
| T-5-02 | Denial of Service | app/(app)/account/analytics/page.js | mitigate | Validate range parameter strictly against allowlist ['7d', '30d'] |
</threat_model>

<verification>
Run `node --env-file=.env scripts/verify-phase5.js` and `npm run build`.
</verification>

<success_criteria>
Device/referrer metadata capture, 7d/30d server-authoritative window aggregation, deterministic link ranking, historical data compatibility, and empty-state dashboard pass all verification checks.
</success_criteria>

<output>
Create `.planning/phases/05-analytics-worth-reading/05-1-SUMMARY.md` when done
</output>
