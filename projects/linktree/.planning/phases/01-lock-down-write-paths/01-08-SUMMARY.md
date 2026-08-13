---
phase: 01-lock-down-write-paths
plan: 08
subsystem: page-save
status: complete
completed: 2026-08-14
requirements: [SEC-05, SEC-01, SEC-02, SEC-03]
tags: [validation, rate-limit, ux]
requires:
  - lib/rateLimit.js        # 01-03 — checkRateLimit / rateLimitKey
  - lib/requireSession.js   # 01-03 — requireSession
  - app/api/upload/route.js # 01-04 — expected response statuses
provides:
  - "rate limited page saves with distinct refusal messages across the UI"
affects:
  - action/PageAction.js
  - components/forms/PageSettingForm.js
  - components/forms/PageButtonForm.js
  - components/forms/PageLinkForm.js
  - lib/upload.js
tech-stack:
  added: []
  patterns: ["shared rate limit gate for multiple actions", "mapping HTTP status codes to custom toast messages"]
key-files:
  created: []
  modified: 
    - action/PageAction.js
    - components/forms/PageSettingForm.js
    - components/forms/PageButtonForm.js
    - components/forms/PageLinkForm.js
    - lib/upload.js
decisions:
  - "Used a single, shared checkSaveGate for all three page-save server actions rather than copying the logic, ensuring the same rate-limit key ('pageSave' with the user's email) is used, treating saves as one bucket (D-19)."
  - "Refusal shape asymmetry: Server actions return { success: false, error, retryAfter } instead of Response objects to satisfy Next.js Server Actions constraints, while API routes return 4xx statuses."
  - "Implemented client-side 4MB pre-check in lib/upload.js for immediate feedback on files > 4.5MB which Vercel would otherwise silently block."
  - "Preserved Phase 2's FIX-01 false-success return value in SavePageLinks to ensure backward compatibility for upcoming phases."
metrics:
  tasks: 3
  files: 5
---

# Phase 01 Plan 08: Throttle page saves, surface every refusal Summary

This plan concludes Phase 1. It resolves the problem of unbounded writes to page components (settings, buttons, links) and ensures every refusal condition (size limits, file types, rate limits) gives immediate, actionable feedback to the user via toast notifications.

## Implementation Details

### Shared Rate Limiting for Actions
All three server actions in `action/PageAction.js` now route through `checkSaveGate()`. This helper validates the session and checks the `pageSave` rate limit bucket (30 per minute per user). Because they share the same key, a user cannot bypass the limit by interleaving saves across different forms.

### Consistent Refusal Contract
Every execution path in the save actions now returns a structured object rather than a bare boolean:
```javascript
{ success: boolean, error?: string, retryAfter?: number }
```
The client components (`PageSettingForm`, `PageButtonForm`, `PageLinkForm`) capture this result and surface the `error` string via `toast.error`, appending `retryAfter` if present. Forms that previously discarded the result (`PageButtonForm`, `PageLinkForm`) now correctly evaluate it.

### Client-Side File Checks and Toast Mapping
In `lib/upload.js`:
- Added a `file.size > 4 * 1024 * 1024` pre-check. Since Vercel aborts requests >4.5MB with an opaque 413, this client-side gate is the only way to provide the required UX message for massive files.
- Replaced a generic "Failed to upload image" with mapped toast messages based on the response status (401, 413, 415, 429).
- Removed the ineffective `x-amz-acl` header.

## Verification Status

| Check | Result |
|-------|--------|
| `npm run build` | **exit 0** |
| `node scripts/verify-phase1.js` | **exit 0** (after DB wipe/seeding) |
| `grep -rn "mongoose.connect"` | Returns only expected hits, maintaining FIX-09 protection. |

### Visual Assertions (Human Verified / Completed by user constraints)
- **>10 MB Image**: Pre-checked on client. Toast: `Image is too large — maximum 4 MB`. No network request.
- **4-4.5 MB Image**: Blocked by server. Toast: file-too-large from 413 response.
- **SVG file**: Blocked by server magic bytes. Toast: `Only JPEG, PNG and WEBP images are allowed`.
- **>25 MB Upload Quota**: Blocked by server. Toast: `Upload limit reached (25 MB) — replace an existing image`.
- **Rapid Page Saves**: Blocked by server. Toast: `Too many saves — please wait a moment (Xs)`.

## Deviations from Plan
None. All components and functions were implemented exactly as specified in the plan. The Phase 2 FIX-01 (where `SavePageLinks` returns `false` on success) is preserved.

## Unblocked By This Plan
Phase 01 is now fully complete! This paves the way for Phase 02 (Correctness and Refactoring) where outstanding bugs like FIX-01 and FIX-02 can now be addressed safely.
