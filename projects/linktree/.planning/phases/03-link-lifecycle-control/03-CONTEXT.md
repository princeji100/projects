# Phase 3: Link Lifecycle Control - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 implements owner-facing link lifecycle controls (active toggling, scheduled publishing with start date/time, and link expiration with end date/time), ensuring that public profile pages dynamically render only live links while the owner's dashboard provides complete management and visual status indicators.

**In scope:**
- **LINK-01**: Active/inactive toggle on each link. Inactive links remain editable in dashboard but are hidden from the public page.
- **LINK-02**: Optional start date/time (`startsAt`) for scheduled publishing.
- **LINK-03**: Optional end date/time (`endsAt`) for link expiration.
- **LINK-04**: 100% backward compatibility for legacy links lacking lifecycle fields (defaulting to active with no time constraints).
- **Single Source of Truth**: Shared lifecycle evaluation helper (`lib/linkLifecycle.js`) used for both dashboard status badges and public page filtering.
- **Validation**: Server-side validation enforcing `endsAt > startsAt` when both are provided.

**Out of scope:**
- Profile themes or QR code generation (Phase 4).
- Granular analytics by device/referrer (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### 1. Unified Lifecycle Evaluator (`lib/linkLifecycle.js`)
- **D-01:** Create a shared server-side helper `lib/linkLifecycle.js` exporting:
  - `getLinkLifecycleStatus(link, now = new Date())`: returns `'inactive' | 'scheduled' | 'expired' | 'live'`.
  - `isLinkLive(link, now = new Date())`: returns `true` if and only if `getLinkLifecycleStatus(link, now) === 'live'`.
- **D-02:** Strict lifecycle precedence order:
  1. `link.active === false` (or boolean false) -> `'inactive'`
  2. `startsAt` exists and `new Date(startsAt) > now` -> `'scheduled'`
  3. `endsAt` exists and `now >= new Date(endsAt)` -> `'expired'`
  4. Otherwise -> `'live'`

### 2. Backward Compatibility & Legacy Semantics (LINK-04)
- **D-03:** If `link.active` is `undefined` or `null`, it defaults to `true`.
- **D-04:** Missing `startsAt` means no start constraint (immediately active).
- **D-05:** Missing `endsAt` means no expiration (remains active indefinitely).
- **D-06:** Support both field naming conventions (`startsAt`/`startDate`, `endsAt`/`endDate`) gracefully with `startsAt` and `endsAt` as canonical.

### 3. Timestamp & Timezone Handling
- **D-07:** Timestamps are stored as UTC ISO-8601 strings in MongoDB (`Page.links`).
- **D-08:** UI forms convert between local browser timezone and UTC ISO strings using standard `<input type="datetime-local">` boundaries.

### 4. Server-Side Validation in `action/PageAction.js`
- **D-09:** `SavePageLinks(links)` validates all link payloads before updating the database:
  - If `link.startsAt && link.endsAt`, assert `new Date(link.endsAt) > new Date(link.startsAt)`.
  - If invalid (`endsAt <= startsAt`), refuse the update with `{ success: false, error: 'Link expiration time must be after start time' }`.

### 5. Dashboard UI & Status Badges
- **D-10:** In `components/forms/PageLinkForm.js`:
  - Add an active toggle switch on each link card.
  - Add a collapsible or dedicated "Schedule & Visibility" panel with Start & End `datetime-local` inputs and a "Clear Schedule" button.
  - Display real-time status badges:
    - **Live** (Green badge: `Live`)
    - **Inactive** (Slate badge: `Inactive`)
    - **Scheduled** (Blue badge: `Scheduled for [date]`)
    - **Expired** (Amber/Red badge: `Expired [date]`)

### 6. Public Profile Route Filtering
- **D-11:** In `app/(page)/[uri]/page.js`, filter links using `page.links.filter(link => isLinkLive(link))` prior to rendering.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` § Phase 3: Link Lifecycle Control (`LINK-01` … `LINK-04`)
- `lib/linkLifecycle.js` — Single source of truth for link status evaluation
- `components/forms/PageLinkForm.js` — Link editor and status badge UI
- `action/PageAction.js` — Server-side link validation and persistence
- `app/(page)/[uri]/page.js` — Public profile link visibility filtering

</canonical_refs>

<code_context>
## Existing Code Insights

- `Page.links` is an array of subdocuments in MongoDB.
- `PageLinkForm.js` uses React state to manage links array before calling `SavePageLinks`.
- `app/(page)/[uri]/page.js` receives `page` from MongoDB and iterates over `page.links`.

</code_context>

<deferred>
## Deferred Ideas
- Recurring daily/weekly time windows (future enhancement).
- Link click caps / auto-expiring on click limits (future enhancement).

</deferred>
