# Phase 5 Technical Research: Analytics Worth Reading

## 1. Device & Referrer Normalization Architecture

### Parser Specification (`lib/analyticsParser.js`)
- **Device Parser (`parseDevice(userAgent)`)**:
  - Tablet detection: `/(ipad|tablet|(android(?!.*mobile)))/i`
  - Mobile detection: `/(mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini)/i`
  - Desktop detection: `/(windows nt|macintosh|mac os x|linux(?!.*android)|cros)/i`
  - Safe fallback: `'other'`
- **Referrer Normalizer (`normalizeReferrer(refererHeader)`)**:
  - URL parsing: isolates `hostname`, converts to lowercase.
  - Strips leading `www.` prefix and common web redirect subdomains (`l.instagram.com` -> `instagram.com`, `t.co` -> `twitter.com`, `m.facebook.com` / `l.facebook.com` -> `facebook.com`).
  - Same-origin or internal referrers resolve to `'direct'`.
  - Empty, missing, invalid, or privacy-stripped referrers resolve to `'direct'`.

---

## 2. Event Model Schema & Historical Ingestion Compatibility

### `models/Event.js`
```javascript
const EventSchema = new Schema({
  type: { type: String, required: true }, // 'view' | 'click'
  page: { type: String, required: true }, // page uri
  url: { type: String, default: '' },     // clicked link url or page uri
  device: { type: String, enum: ['mobile', 'desktop', 'tablet', 'other'], default: undefined },
  referrer: { type: String, default: undefined },
}, {
  timestamps: true,
});
```
- Schema defaults are deliberately left undefined so historical records lack `device` and `referrer` fields.
- Aggregations map missing fields using `$ifNull: ['$device', 'Unknown']` and `$ifNull: ['$referrer', 'Unknown']`.

---

## 3. Server-Authoritative 7d / 30d Time Window Derivation

### Range Parameter Validation
- Accepts `?range=7d` or `?range=30d`. Default: `'7d'`.
- `rangeDays = range === '30d' ? 30 : 7`.
- Server computes single time window:
  - `windowEnd = new Date()` (end of current render tick)
  - `windowStart = subDays(windowEnd, rangeDays - 1)` (start of range)
- Continuous daily series: fills every date between `windowStart` and `windowEnd` with 0 if no clicks occurred.

---

## 4. Deterministic Link Ranking Algorithm
- Aggregate clicks grouped by `url` within `[windowStart, windowEnd]`.
- Map against `Page.links` array:
  - Match each link by its `url`.
  - Primary sort: `clicks` descending.
  - Deterministic tie-breaker: original link index in `page.links` ascending.
  - Compute `percentage = totalRankedClicks > 0 ? ((clicks / totalRankedClicks) * 100).toFixed(1) : 0`.
- Retain 0-click links at the bottom with explicit `0 clicks (0.0%)`.

---

## 5. Visual Dashboard Sections & Empty State
1. **Summary Metrics Row**: Total Views, Total Clicks, Top Link, Top Referrer.
2. **Segmented Range Control**: URL-driven tab toggle (`7 Days` vs `30 Days`).
3. **Daily Clicks Timeline Chart**: Line chart with continuous date axis.
4. **Device Breakdown & Referrer Breakdown Cards**: Donut/bar share distribution with distinct "Unknown" category for historical events.
5. **Top Performing Links Table**: Ranked list with title, URL, clicks, and proportional progress bars.
6. **Zero-Event Empty State**: Shown when total views + clicks in window is 0.
