# Roadmap: Linktree

## Overview

The app already works and is live — this milestone makes it safe to leave running, correct on the
paths that are broken today, and good enough to hand to a recruiter. It starts by closing the open
write endpoints that currently let any stranger push objects into a personal S3 bucket, then clears
the nine confirmed defects that sit between a visitor and a working page. With the foundation
trustworthy, it adds the three owner-facing capabilities that were missing (link scheduling, theme
presets, a shareable QR code), deepens analytics so the click data is actually worth reading, and
finishes with the README and screenshots that make the repo readable by the same people who open
the live link.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Lock Down Write Paths** - Close the unauthenticated upload endpoint and every other write a stranger can reach
- [x] **Phase 1.5: Admin & Upload Management** (INSERTED) - Screens to manage the allowlist and the uploads Phase 1 starts tracking (completed 2026-08-13)
- [ ] **Phase 2: Fix the Broken Paths** - Clear the nine confirmed defects in the public page, claim flow, and dashboard
- [ ] **Phase 3: Link Lifecycle Control** - Owners toggle links on/off and schedule them without deleting anything
- [ ] **Phase 4: Themes & QR Sharing** - One-click theme presets plus a downloadable QR code for the profile
- [ ] **Phase 5: Analytics Worth Reading** - Referrer, device, 7/30-day trends, and top links
- [ ] **Phase 6: Portfolio Presentation** - README, screenshots, and `.env.example` for the repo audience

## Phase Details

### Phase 1: Lock Down Write Paths

**Goal**: Every write endpoint refuses strangers, oversized payloads, and abuse — the S3 bill stops being exposed to the internet
**Depends on**: Nothing (first phase)
**Requirements**: SEC-11, SEC-12, SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07, SEC-08
**Success Criteria** (what must be TRUE):

  1. An email that is not on the allowlist cannot sign in, and is told the app is invite-only
  2. The pre-existing Pages, Users, Events, adapter collections, and S3 objects are gone — the app starts from an empty state
  3. Nothing reaches S3 without a valid session, an allowlisted image content type verified by magic bytes, and a size under the server-enforced cap
  4. An account that hits its upload quota gets a clear refusal instead of another S3 object
  5. Rapid repeat writes to upload, page save, and username claim are throttled per user
  6. Reserved names (`api`, `account`, `login`, `about`, admin-ish words) and malformed usernames are refused at claim time with the reason shown
  7. A malformed `/api/click` request returns a 4xx, never a 500

**Plans**: 8 plans

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — SEC-12 destructive wipe (Mongo collections + S3 bucket), `lib/s3.js` extraction

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — magic-byte sniffing, username validator, and the `verify-phase1.js` harness
- [x] 01-03-PLAN.md — Upload/RateLimit/AllowedUser models plus the shared session and rate-limit helpers

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-04-PLAN.md — all five upload gates on `/api/upload` (session, size, MIME, quota, rate limit)
- [ ] 01-05-PLAN.md — invite-only `signIn` allowlist, the `/login` AccessDenied message, allowlist seed script
- [x] 01-06-PLAN.md — username claim: charset, length, reserved words, 5/hour limit
- [x] 01-07-PLAN.md — `/api/click` hardening (both verified bugs) plus the 60/min per-IP limit

**Wave 4** *(blocked on Wave 3 completion)*

- [ ] 01-08-PLAN.md — page-save throttling and the refusal toasts across every write surface

Notes:

- Backend gates only. The admin allowlist page and the upload manager UI were split into Phase 1.5 during discussion. Phase 1 ships the `AllowedUser`, `Upload`, and `RateLimit` collections; Phase 1.5 ships the screens.
- SEC-12 (the wipe) runs FIRST, before any gate. It is irreversible and removes the owner's own page, which is re-claimed afterwards. It also removes any need for an upload backfill.
- Vercel free tier is serverless with no background workers and no Redis, so rate limiting (SEC-05) has to be backed by something already in the stack — a MongoDB TTL collection is the obvious fit. Do not introduce infrastructure for this.
- Gates go in shared `lib/` helpers, not `middleware.js`: server actions bypass middleware and mongoose does not run on the Edge runtime.
- SEC-06/07 also constrain the claim flow that Phase 2 fixes (FIX-02); keep the validation server-side so both the action and the form agree.
- Full decision record: `.planning/phases/01-lock-down-write-paths/01-CONTEXT.md` (D-01 … D-30).

### Phase 1.5: Admin & Upload Management (INSERTED)

**Goal**: The owner manages who gets in and what is stored, without touching the database by hand
**Depends on**: Phase 1
**Requirements**: ADMIN-01, ADMIN-02, UPLOAD-01, UPLOAD-02
**Success Criteria** (what must be TRUE):

  1. The admin (matched against `ADMIN_EMAIL`) can see the allowlist and add or remove an email from a page in the app
  2. A signed-in non-admin who navigates to the admin page is refused, not shown the controls
  3. The owner sees their own uploads with thumbnail, size, and total usage against the 25 MB quota
  4. Deleting an upload removes the S3 object and the `Upload` record, and the freed quota is immediately usable
  5. Deleting an image still referenced by the page warns before it happens

**Plans**: 2 plans

Plans:
- [x] 01.5-1-PLAN.md — Admin allowlist UI, server actions, and session revocation
- [x] 01.5-2-PLAN.md — Uploads manager, quota progress meter, and safe deletion cascade
**UI hint**: yes

Notes:

- Inserted 2026-08-09 during the Phase 1 discussion, to keep Phase 1 a backend-security phase. Every collection these screens read (`AllowedUser`, `Upload`) is created in Phase 1.
- Until this phase ships, allowlist entries are inserted manually via Atlas or a script.

### Phase 2: Fix the Broken Paths

**Goal**: A visitor and an owner can walk the whole app without hitting a crash, a lie, or a silent miscount
**Depends on**: Phase 1
**Requirements**: FIX-01, FIX-02, FIX-03, FIX-04, FIX-05, FIX-06, FIX-07, FIX-08, FIX-09
**Success Criteria** (what must be TRUE):

  1. Visiting an unclaimed `/username` returns a 404 page, and no view Event is recorded for it
  2. A profile whose avatar or background image is missing renders a fallback instead of throwing in `next/image`
  3. Saving links and claiming a username both report their true outcome — a taken name stays on the form with an error, a successful link save reports success
  4. Social button icons render their intended colors in a production build, not the purged-class default
  5. A full walkthrough of public page, dashboard, and analytics produces no server or console errors — no async-`params` warning, no unstable-key remounts, one MongoDB connection path

**Plans**: TBD

Notes:

- All nine defects have known file:line locations in REQUIREMENTS.md and are one-to-a-few-line changes. Keep this as a small number of plans; do not split per defect.

### Phase 3: Link Lifecycle Control

**Goal**: Owners decide which links are live and when, without losing the link
**Depends on**: Phase 2
**Requirements**: LINK-01, LINK-02, LINK-03, LINK-04
**Success Criteria** (what must be TRUE):

  1. Owner can toggle a link inactive and it disappears from the public page while staying editable in the dashboard
  2. Owner can set an optional start date, end date, or both on a link
  3. The public page renders only links whose publish window includes the current time
  4. Pages saved before this change render exactly as they did — a link with no active flag and no window is treated as live

**Plans**: TBD
**UI hint**: yes

Notes:

- `Page.links` is a loosely-typed Object today and the public reader at `app/(page)/[uri]/page.js` consumes it directly. Live documents exist, so the new fields must be optional with live-by-default semantics — no migration step, no required fields.

### Phase 4: Themes & QR Sharing

**Goal**: Owners restyle the page in one click and hand out a scannable link to it
**Depends on**: Phase 2
**Requirements**: THEME-01, THEME-02, THEME-03, QR-01, QR-02
**Success Criteria** (what must be TRUE):

  1. Owner can pick a preset theme in page settings and see the change previewed before saving
  2. A saved preset is what a visitor actually sees on the public page
  3. Custom background color and custom background image still work unchanged alongside presets
  4. Owner sees a QR code in the dashboard that scans to their own public page URL
  5. Owner can download that QR code as an image file

**Plans**: TBD
**UI hint**: yes

Notes:

- The Page model has no theme field today and existing documents use `bgType`/`bgColor`/`bgImage`. A preset has to resolve into (or sit alongside) those existing fields so pages saved before this phase keep rendering.

### Phase 5: Analytics Worth Reading

**Goal**: Owners can tell where their traffic came from and which links earn the clicks
**Depends on**: Phase 2
**Requirements**: ANA-01, ANA-02, ANA-03, ANA-04
**Success Criteria** (what must be TRUE):

  1. A new click records the referrer and the device it came from
  2. Owner can switch the analytics view between a 7-day and a 30-day window
  3. Owner sees links ranked by click count over the selected window
  4. Reports render over events recorded before this phase, showing an unknown/other bucket rather than breaking
  5. A profile with no events yet shows an empty state, not a broken chart

**Plans**: TBD
**UI hint**: yes

Notes:

- ANA-01 must land before or with ANA-02/03 — the Event model has no referrer or device field, so there is nothing to report on until capture ships. Historical events will permanently lack these fields; every report has to tolerate their absence (criterion 4).

### Phase 6: Portfolio Presentation

**Goal**: Someone who opens the repo understands the app and can run it without asking a question
**Depends on**: Phases 3, 4, 5 (screenshots need the finished UI)
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):

  1. README states what the app is, links the live deployment, lists the stack, and gives local setup steps that work
  2. README shows screenshots of the public page and the dashboard in their finished state
  3. `.env.example` lists every environment variable the app reads, with placeholders and no real secrets
  4. A fresh clone can be run locally following only the README

**Plans**: TBD

Notes:

- The repo builds from `projects/linktree` inside the `princeji100/projects` monorepo; setup instructions must not assume the repo root.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 1.5 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Lock Down Write Paths | 8/8 | Complete | 2026-08-14 |
| 1.5. Admin & Upload Management | 2/2 | Complete   | 2026-08-13 |
| 2. Fix the Broken Paths | 0/TBD | Not started | - |
| 3. Link Lifecycle Control | 0/TBD | Not started | - |
| 4. Themes & QR Sharing | 0/TBD | Not started | - |
| 5. Analytics Worth Reading | 0/TBD | Not started | - |
| 6. Portfolio Presentation | 0/TBD | Not started | - |

## Coverage

All 39 v1 requirements are mapped to exactly one phase each.

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1 | SEC-01 … SEC-08, SEC-11, SEC-12 | 10 |
| 1.5 | ADMIN-01/02, UPLOAD-01/02 | 4 |
| 2 | FIX-01 … FIX-09 | 9 |
| 3 | LINK-01 … LINK-04 | 4 |
| 4 | THEME-01 … THEME-03, QR-01, QR-02 | 5 |
| 5 | ANA-01 … ANA-04 | 4 |
| 6 | DOC-01 … DOC-03 | 3 |
| | **Total** | **39** |

---
*Roadmap created: 2026-08-09 | Amended 2026-08-09 after the Phase 1 discussion: Phase 1.5 inserted,
SEC-11/SEC-12 added to Phase 1.*
