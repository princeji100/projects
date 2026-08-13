# Phase 3 Technical Research: Link Lifecycle Control

## 1. Lifecycle Architecture & State Machine

### State Precedence
The lifecycle status is derived deterministically by `lib/linkLifecycle.js`:
```text
1. Active flag check:
   if (link.active === false) -> 'inactive'

2. Future scheduled start:
   if (startsAt && startsAt > now) -> 'scheduled'

3. Past expiration:
   if (endsAt && now >= endsAt) -> 'expired'

4. Default / Active window:
   -> 'live'
```

### Date Boundaries & Validation Rules
- `startsAt` only: Link becomes live once `now >= startsAt`.
- `endsAt` only: Link remains live until `now >= endsAt`.
- Both `startsAt` and `endsAt`: Must satisfy `new Date(endsAt) > new Date(startsAt)`.
- Malformed timestamps: String values that fail `isNaN(new Date(val).getTime())` must be rejected at the server action validation gate with a 400 Bad Request error.
- Legacy backward compatibility: Links lacking `active`, `startsAt`, or `endsAt` are treated as `{ active: true, startsAt: null, endsAt: null }` and evaluate to `'live'`.

---

## 2. Server-Authoritative Public Filtering
- In [`app/(page)/[uri]/page.js`](file:///home/princeji/Documents/Codes/projects/linktree/app/(page)/[uri]/page.js), links are filtered on the server:
  ```javascript
  const liveLinks = (page.links || []).filter((link) => isLinkLive(link));
  ```
- Non-live links are not rendered or sent in the HTML output, ensuring security and privacy of unreleased/expired links.

---

## 3. UI/UX Interaction Pattern
- In [`components/forms/PageLinkForm.js`](file:///home/princeji/Documents/Codes/projects/linktree/components/forms/PageLinkForm.js):
  - Toggle switch for instant `active: boolean` state.
  - Interactive "Schedule" collapsible section with start & end `datetime-local` pickers.
  - Status badges with distinct visual cues:
    - **Live**: `bg-emerald-50 text-emerald-700 border-emerald-200`
    - **Inactive**: `bg-slate-100 text-slate-600 border-slate-200`
    - **Scheduled**: `bg-blue-50 text-blue-700 border-blue-200`
    - **Expired**: `bg-amber-50 text-amber-700 border-amber-200`
