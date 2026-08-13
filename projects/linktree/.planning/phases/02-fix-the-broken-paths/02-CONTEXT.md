# Phase 2: Fix the Broken Paths - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 resolves nine confirmed defects across the public profile route, username claim flow, page settings, button configurations, and dashboard analytics.

**In scope:**
- **FIX-01**: `SavePageLinks` returns `{ success: true }` on valid saves (`action/PageAction.js`).
- **FIX-02**: `UserNameForm` checks `result.success`, preserves user input on rejection, and displays actionable field-level errors without false redirects (`components/forms/UserNameForm.js`).
- **FIX-03**: Non-existent `/username` triggers standard Next.js `notFound()` rendering a 404 page (`app/(page)/[uri]/page.js` & `not-found.js`).
- **FIX-04**: Prevent writing view `Event` records when profile is missing (`app/(page)/[uri]/page.js`).
- **FIX-05**: Graceful fallback rendering for missing/deleted avatars and backgrounds without broken image URLs or `next/image` crashes (`app/(page)/[uri]/page.js`, `components/forms/PageSettingForm.js`).
- **FIX-06**: `params` awaited per Next.js 15 async dynamic route API (`app/(page)/[uri]/page.js`).
- **FIX-07**: Analytics link rows use stable keys (e.g. `link.url || index`) rather than regenerating `uuidv4()` on every render (`app/(app)/account/analytics/page.js`).
- **FIX-08**: Centralized, purge-safe platform brand styling for social buttons with neutral fallback (`components/forms/PageButtonForm.js`, `lib/socialButtons.js`).
- **FIX-09**: Unify MongoDB connection in `action/grabusername.js` to use shared `@/lib/connectToDB`.

**Out of scope:**
- Redesigning dashboard layouts or introducing theme presets (Phase 4).
- Link scheduling toggles (Phase 3).
- Analytics referrer/device breakdown (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### 1. 404 & Missing Profile Flow (FIX-03, FIX-04, FIX-06)
- **D-01:** In `app/(page)/[uri]/page.js`, `params` must be awaited: `const { uri } = await params;`.
- **D-02:** If `Page.findOne({ uri })` returns null, immediately invoke `notFound()` from `next/navigation`.
- **D-03:** Event creation (`Event.create({ url: uri, page: uri, type: 'view' })`) must only execute AFTER confirming `page` exists, ensuring no ghost view events are logged for missing profiles.
- **D-04:** Provide a dedicated, polished `not-found.js` in `app/(page)/[uri]/` that informs the visitor the profile does not exist and offers a link to return home or claim their own page.

### 2. Avatar & Background Fallback Handling (FIX-05)
- **D-05:** When `user.image` or avatar is empty, null, or deleted, render a fallback icon/initials container with a gradient/slate background instead of passing empty strings to `next/image`.
- **D-06:** When `page.bgImage` is empty or invalid, render a clean fallback gradient without rendering broken `url()` styling.
- **D-07:** In `PageSettingForm.js`, ensure preview and avatar containers handle empty/deleted image states gracefully with placeholder icons.

### 3. Claim & Save Form State & Error Reporting (FIX-01, FIX-02)
- **D-08:** `SavePageLinks` in `action/PageAction.js` must return `{ success: true }` on successful database update so forms correctly toast success.
- **D-09:** `UserNameForm.js` must check `result.success`:
  - If `result.success` is false: preserve the entered username in the input field, display the specific `result.error` message directly under the input, and do NOT redirect.
  - If `result.success` is true: navigate to `/account?created={username}`.

### 4. Centralized Social Button Styling (FIX-08)
- **D-10:** Create a centralized configuration in `lib/socialButtons.js` mapping each platform key (`email`, `instagram`, `twitter`, `github`, etc.) to its FontAwesome icon, label, placeholder, and explicit purge-safe color styles.
- **D-11:** Include a neutral fallback style for any unrecognized or future platform keys.

### 5. Code Stability & Connection Hygiene (FIX-07, FIX-09)
- **D-12:** Replace `uuidv4()` in `app/(app)/account/analytics/page.js` link mapping with stable keys (`${link.url}-${index}`) to prevent unnecessary component remounts and render instability.
- **D-13:** In `action/grabusername.js`, replace private `mongoose.connect` with the shared `@/lib/connectToDB` utility.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` § Phase 2: Fix the Broken Paths (`FIX-01` … `FIX-09`)
- `app/(page)/[uri]/page.js` — Public profile route
- `components/forms/UserNameForm.js` — Username claim form
- `components/forms/PageButtonForm.js` — Social buttons editor
- `components/forms/PageSettingForm.js` — Profile & background editor
- `action/PageAction.js` — Page settings and links server actions
- `action/grabusername.js` — Username claim server action
- `app/(app)/account/analytics/page.js` — Dashboard analytics page
- `lib/connectToDB.js` — Single source of truth for database connections

</canonical_refs>

<code_context>
## Existing Code Insights

- `PageSettingForm.js` and `PageLinkForm.js` import from `@/action/PageAction`.
- `app/(page)/[uri]/page.js` is a Server Component with Next.js dynamic routing.
- `lib/connectToDB.js` manages cached mongoose connections across module reloads.

</code_context>

<deferred>
## Deferred Ideas
- Dynamic custom themes and layout switcher (Phase 4).
- Granular analytics filters by device and referrer (Phase 5).

</deferred>
