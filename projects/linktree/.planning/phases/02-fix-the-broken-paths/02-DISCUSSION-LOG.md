# Phase 2: Fix the Broken Paths — Discussion Log

**Date:** 2026-08-14
**Status:** Complete

## Discussion Areas Covered

### 1. 404 & Missing Profile Handling (FIX-03, FIX-04, FIX-06)
- **User Decision:** Use standard Next.js `notFound()` flow without leaking implementation details.
- **Rules Locked:**
  - `const { uri } = await params;`
  - When `Page.findOne({ uri })` is null, invoke `notFound()`.
  - Do NOT write view `Event` records for non-existent profiles.
  - Deliver dedicated `not-found.js` with a clean call-to-action.

### 2. Missing or Deleted Image Fallbacks (FIX-05)
- **User Decision:** Missing or deleted avatars and backgrounds must degrade gracefully to built-in fallbacks with no broken URLs or `next/image` crashes.
- **Rules Locked:**
  - User avatar falls back to placeholder icon/initials container when empty.
  - Page background falls back to default gradient style.

### 3. Claim & Save Form State and Error Handling (FIX-01, FIX-02)
- **User Decision:** Preserve valid user input on failure, show clear field-level errors where actionable, and use global toasts for non-field outcomes.
- **Rules Locked:**
  - `UserNameForm` checks `result.success` before redirecting. On failure, keeps the entered username in input and displays the field-level error.
  - `SavePageLinks` returns `{ success: true }` on valid saves.

### 4. Social Button Brand Styling (FIX-08)
- **User Decision:** Centralize platform-to-brand-style mapping in a single maintainable helper with accessible contrast and a neutral fallback for unknown platforms.
- **Rules Locked:**
  - Extract button configurations into a shared module (`lib/socialButtons.js`).
  - Use purge-safe static classes or inline color values.

### 5. Stability & Connection Hygiene (FIX-07, FIX-09)
- **User Decision:** Use stable keys in analytics and unify MongoDB connection handling.
- **Rules Locked:**
  - Replace `uuidv4()` in `app/(app)/account/analytics/page.js` with stable key index.
  - `action/grabusername.js` uses `@/lib/connectToDB`.
