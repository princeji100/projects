# Requirements: Linktree

**Defined:** 2026-08-08
**Core Value:** A stranger opens `/username` and sees a page that loads fast, looks good, and whose links work — every time, without the owner having to check on it.

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Security

Signup is gated by an email allowlist (decided 2026-08-09, reversing the earlier open-signup
decision). Public profile pages stay public; only account creation is invite-only.

- [ ] **SEC-11**: An email that is not on the allowlist cannot sign in, and sees a clear
  invite-only message rather than a generic error
- [ ] **SEC-12**: All pre-existing data (Pages, Users, Events, NextAuth adapter collections, and
  every S3 object) is wiped once before the gates go live — a clean slate with no migration or
  backfill path
- [ ] **SEC-01**: `/api/upload` rejects requests without a valid session
- [ ] **SEC-02**: Uploads are rejected above a size cap (server-enforced, not just client-side)
- [ ] **SEC-03**: Uploads are rejected unless the content type is an allowlisted image format
- [ ] **SEC-04**: A single account cannot exceed a per-user upload quota
- [ ] **SEC-05**: Write endpoints (upload, page save, username claim) are rate limited per user
- [x] **SEC-06**: Reserved usernames (`api`, `account`, `login`, `about`, admin-ish words) cannot be claimed
- [x] **SEC-07**: Usernames are validated for charset and length before becoming a public URL
- [x] **SEC-08**: `/api/click` handles malformed input without throwing a 500

### Correctness

Confirmed defects, each located in the codebase.

- [x] **FIX-01**: `SavePageLinks` returns true on success — today it returns false either way, so the caller cannot tell (`action/PageAction.js:63`)
- [x] **FIX-02**: A taken username does not redirect to the success page — checks `result.success`, not `result` (`components/forms/UserNameForm.js:24`)
- [x] **FIX-03**: An unknown `/username` renders a 404 page instead of crashing with a 500 (`app/(page)/[uri]/page.js`)
- [x] **FIX-04**: No view Event is written for a profile that does not exist (`app/(page)/[uri]/page.js:35`)
- [x] **FIX-05**: A missing avatar or background image renders a fallback instead of throwing in `next/image` (`app/(page)/[uri]/page.js:66`, `components/forms/PageSettingForm.js:106`)
- [x] **FIX-06**: `params` is awaited per the Next 15 async API (`app/(page)/[uri]/page.js:31`)
- [x] **FIX-07**: Analytics link rows use stable keys, not a fresh `uuidv4()` per render (`app/(app)/account/analytics/page.js:108`)
- [x] **FIX-08**: Social button icons render their intended colors — the dynamic `text-${key}-500` classes are purged at build (`components/forms/PageButtonForm.js:83,128`)
- [x] **FIX-09**: One MongoDB connection path — `action/grabusername.js` drops its private `mongoose.connect` in favour of `lib/connectToDB.js`

### Admin & Upload Management

Phase 1 ships the collections; these are the screens that manage them.

- [x] **ADMIN-01**: An admin-only page (gated on `ADMIN_EMAIL`) lists allowlisted emails and can
  add or remove them
- [x] **ADMIN-02**: A non-admin who reaches the admin page is refused, not shown the controls
- [x] **UPLOAD-01**: The dashboard lists the owner's uploads with a thumbnail, size, and total
  against the 25 MB quota
- [x] **UPLOAD-02**: Deleting an upload removes both the S3 object and the `Upload` record, freeing
  quota, and warns when the image is still in use on the page

### QR Code

- [x] **QR-01**: The dashboard displays a QR code that resolves to the owner's public page
- [x] **QR-02**: The QR code can be downloaded as an image file

### Themes

- [x] **THEME-01**: A set of preset themes is offered in the page settings form
- [x] **THEME-02**: Selecting a preset applies it in one action, with a live preview before saving
- [x] **THEME-03**: Custom color and custom background image keep working alongside presets

### Link Management

- [x] **LINK-01**: Each link can be toggled active or inactive without deleting it
- [x] **LINK-02**: Inactive links are hidden from the public page but preserved in the dashboard
- [x] **LINK-03**: A link can carry an optional publish window (start and/or end date)
- [x] **LINK-04**: The public page respects the publish window when deciding what to render

### Analytics

- [x] **ANA-01**: Click events capture referrer and device so the data exists to report on
- [x] **ANA-02**: The analytics page offers a 7-day and 30-day view of the trend
- [x] **ANA-03**: Links are ranked by click count over the selected window
- [x] **ANA-04**: A profile with no events yet shows an empty state, not a broken chart

### Presentation

This is a portfolio piece; the repo is read by the same people who open the live link.

- [ ] **DOC-01**: README covers what the app is, the live link, the stack, and local setup
- [ ] **DOC-02**: README includes screenshots of the public page and the dashboard
- [ ] **DOC-03**: `.env.example` documents every environment variable the app reads

## v2 Requirements

Deferred. Tracked but not in this roadmap.

### Security

- **SEC-09**: Abuse reporting and takedown flow for public pages
- **SEC-10**: Content moderation on uploaded images

### Analytics

- **ANA-05**: Geographic breakdown of views
- **ANA-06**: CSV export of analytics data

### Link Management

- **LINK-05**: Link grouping and section headers on the public page

## Out of Scope

| Feature | Reason |
|---------|--------|
| Custom domains | Needs DNS plumbing and a paid Vercel tier; the `/username` URL is enough |
| Payments / pro tier | No monetization intent; Stripe surface area for nothing |
| Email/password auth | Google OAuth works and adds no password-reset burden |
| TypeScript migration | ~2000 lines of working JS; a rewrite delivers nothing to users |
| Team / multi-editor pages | One page, one owner; nobody has asked for more |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-11 | Phase 1 — Lock Down Write Paths | Pending |
| SEC-12 | Phase 1 — Lock Down Write Paths | Pending |
| SEC-01 | Phase 1 — Lock Down Write Paths | Pending |
| SEC-02 | Phase 1 — Lock Down Write Paths | Pending |
| SEC-03 | Phase 1 — Lock Down Write Paths | Pending |
| SEC-04 | Phase 1 — Lock Down Write Paths | Pending |
| SEC-05 | Phase 1 — Lock Down Write Paths | Pending |
| SEC-06 | Phase 1 — Lock Down Write Paths | Complete (01-06) |
| SEC-07 | Phase 1 — Lock Down Write Paths | Complete (01-06) |
| SEC-08 | Phase 1 — Lock Down Write Paths | Complete |
| FIX-01 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-02 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-03 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-04 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-05 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-06 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-07 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-08 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| FIX-09 | Phase 2 — Fix the Broken Paths | Complete (02-01) |
| ADMIN-01 | Phase 1.5 — Admin & Upload Management | Complete (01.5-01) |
| ADMIN-02 | Phase 1.5 — Admin & Upload Management | Complete (01.5-01) |
| UPLOAD-01 | Phase 1.5 — Admin & Upload Management | Complete (01.5-02) |
| UPLOAD-02 | Phase 1.5 — Admin & Upload Management | Complete (01.5-02) |
| LINK-01 | Phase 3 — Link Lifecycle Control | Pending |
| LINK-02 | Phase 3 — Link Lifecycle Control | Pending |
| LINK-03 | Phase 3 — Link Lifecycle Control | Pending |
| LINK-04 | Phase 3 — Link Lifecycle Control | Pending |
| THEME-01 | Phase 4 — Themes & QR Sharing | Pending |
| THEME-02 | Phase 4 — Themes & QR Sharing | Pending |
| THEME-03 | Phase 4 — Themes & QR Sharing | Pending |
| QR-01 | Phase 4 — Themes & QR Sharing | Pending |
| QR-02 | Phase 4 — Themes & QR Sharing | Pending |
| ANA-01 | Phase 5 — Analytics Worth Reading | Pending |
| ANA-02 | Phase 5 — Analytics Worth Reading | Pending |
| ANA-03 | Phase 5 — Analytics Worth Reading | Pending |
| ANA-04 | Phase 5 — Analytics Worth Reading | Pending |
| DOC-01 | Phase 6 — Portfolio Presentation | Pending |
| DOC-02 | Phase 6 — Portfolio Presentation | Pending |
| DOC-03 | Phase 6 — Portfolio Presentation | Pending |

**Coverage:**
- v1 requirements: 39 total
- Mapped to phases: 39 ✓
- Unmapped: 0

---
*Requirements defined: 2026-08-08 | Traceability filled: 2026-08-09*
*Amended 2026-08-09 after Phase 1 discussion: +SEC-11 (allowlist), +SEC-12 (data wipe),
+ADMIN-01/02 and UPLOAD-01/02 (new Phase 1.5).*
