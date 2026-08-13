# Phase 3: Link Lifecycle Control — Discussion Log

**Date:** 2026-08-14
**Status:** Complete

## Discussion Areas Covered

### 1. Single Source of Truth Evaluator
- **User Decision:** Use one shared server-side link lifecycle evaluator as the source of truth for both dashboard status and public-page visibility.
- **Rules Locked:**
  - Create `lib/linkLifecycle.js` exporting `getLinkLifecycleStatus(link, now)` and `isLinkLive(link, now)`.
  - Both dashboard badges and public page filtering consume this exact helper.

### 2. Precedence & Evaluation Rules
- **User Decision:** Define lifecycle precedence explicitly:
  1. `active === false` is Inactive regardless of schedule.
  2. `startsAt > now` is Scheduled.
  3. `now >= endsAt` is Expired.
  4. `startsAt <= now < endsAt` is Live.

### 3. Legacy Backward Compatibility
- **User Decision:** Missing legacy fields must remain backward compatible:
  - Missing `active` defaults to `true`.
  - Missing `startsAt` / `endsAt` means no time constraint.

### 4. Timestamp Storage & Validation
- **User Decision:** Store scheduling timestamps as UTC ISO datetimes. Validate invalid ranges (`endsAt <= startsAt`) server-side.
