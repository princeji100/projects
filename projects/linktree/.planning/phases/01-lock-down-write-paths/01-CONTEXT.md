# Phase 1: Lock Down Write Paths - Context

**Gathered:** 2026-08-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Every write endpoint refuses strangers, oversized payloads, and abuse — the S3 bill stops being
exposed to the internet.

**Backend gates only.** The discussion added two new UI surfaces (admin allowlist page, upload
manager with delete). Both were split out into a new **Phase 1.5 (INSERTED)** so this phase stays
a backend-security phase. Phase 1 ships the collections and the gates; Phase 1.5 ships the screens
that manage them.

**In scope:** SEC-01…SEC-08, plus an invite-only signup gate (new, reverses a PROJECT.md decision),
plus a one-time destructive data wipe that precedes everything else.

**Out of scope:** admin page UI, upload delete UI (both Phase 1.5); the nine FIX-* defects (Phase 2).

</domain>

<decisions>
## Implementation Decisions

### Signup gate (NEW — supersedes a PROJECT.md decision)
- **D-01:** Signup becomes **invite-only**. A NextAuth `signIn` callback checks an `AllowedUser`
  collection; an email not on the list cannot sign in. Rationale: everything runs on free tiers
  (Vercel, S3 personal account, MongoDB Atlas) — an unbounded user count is the real bill risk,
  and quotas only bound per-user cost, not `N`.
- **D-02:** This **reverses** the locked PROJECT.md decision "signup stays open to anyone with a
  Google account". PROJECT.md, REQUIREMENTS.md, and ROADMAP.md all need updating. The multi-tenant
  architecture stays — only the door is gated. Public pages remain public to visitors.
- **D-03:** Denied sign-in shows a clear message on the login page ("This app is invite-only —
  contact the owner for access"), handled via NextAuth's `?error=AccessDenied`. Not the default
  NextAuth error page — a recruiter must see a working app, not a broken one.
- **D-04:** Admin identity is a single `ADMIN_EMAIL` env var compared against the session email.
  No role table, no `isAdmin` flag — one admin does not need a role system.
- **D-05:** In Phase 1, allowlist entries are inserted manually (Atlas UI or a small script), and
  the owner's own email is seeded. The admin UI for this is Phase 1.5.

### Destructive data wipe (runs FIRST)
- **D-06:** At the **start** of Phase 1, wipe all existing data: `Page`, `User`, `Event`
  collections and every object in the S3 bucket. NextAuth's adapter collections (`users`,
  `accounts`, `sessions`) go too — otherwise stale sessions outlive the wipe.
- **D-07:** Explicitly confirmed by the user as irreversible, including the owner's own page,
  which will be re-claimed afterwards.
- **D-08:** Consequence: the Upload-record **backfill is dropped**. There is nothing to backfill —
  quota counting starts from an empty bucket. (An earlier decision to backfill from
  `User.image` / `Page.bgImage` / `Page.links[].icon` URLs is void.)

### Upload gates (SEC-01, 02, 03, 04)
- **D-09:** `/api/upload` requires a valid session — it has none today.
- **D-10:** Size cap: **4 MB per file**, server-enforced. Chosen to sit under Vercel's ~4.5 MB
  serverless request body limit so an oversized upload is refused by the app with a clear message
  rather than failing at the platform with a confusing error.
- **D-11:** Per-user quota: **25 MB total bytes** (not file count) — bytes map directly to the S3
  bill, which is the actual risk. ~10 reasonable images.
- **D-12:** New `Upload` collection: `{ owner, key, size, url, createdAt }`. Quota is the sum of
  `size` for an owner. This one collection serves quota accounting (Phase 1) and the upload
  manager UI (Phase 1.5).
- **D-13:** MIME allowlist: **jpeg, png, webp only**. **No SVG** — objects are served
  `public-read` straight from S3, so an SVG containing `<script>` is stored XSS. GIF excluded too
  (large, not needed for profile images).
- **D-14:** Type is verified by **magic bytes** on the buffer (JPEG `FFD8FF`, PNG `89504E47`,
  WEBP `RIFF....WEBP`), not by the client-supplied `Content-Type`. The buffer is already in memory
  in the current handler. ~10 lines, no new dependency — the `file-type` package is not worth
  adding for three formats.
- **D-15:** S3 objects stay `ACL: public-read`. Presigned URLs would have to be generated per
  render on the public page and would break caching and `next/image`. With the MIME gate in place,
  the XSS vector is closed at the door instead.
- **D-16:** Quota-exceeded shows a clear refusal ("Upload limit reached (25 MB) — replace an
  existing image"). Deleting to free quota is Phase 1.5.

### Rate limiting (SEC-05)
- **D-17:** Storage is a **MongoDB `RateLimit { key, count, expiresAt }` collection with a TTL
  index** — Mongo expires old documents itself, so there is no cleanup code. One `findOneAndUpdate`
  upsert per request. No Redis and no new external service: Vercel free is serverless, and an
  in-memory `Map` is per-lambda-instance and therefore trivially bypassed.
- **D-18:** Key is the **session email when authenticated, the `x-forwarded-for` IP when not**.
  `/api/click` is unauthenticated by design (public visitors click), so it keys on IP. Pure per-IP
  everywhere would false-block users behind a shared NAT.
- **D-19:** Limits: upload **10/min**, page save **30/min**, username claim **5/hour**,
  `/api/click` **60/min per IP**. Claim is deliberately strict — it is the username-enumeration
  path. Normal editing never approaches these.
- **D-20:** Refusal is **429 with a `Retry-After` header**, surfaced client-side as a
  `react-toastify` toast (already a dependency). Not a silent 200 — a legit user must not think a
  save succeeded when it did not.

### Username rules (SEC-06, SEC-07)
- **D-21:** Charset `^[a-z0-9_-]+$`. Lowercasing already happens in `action/grabusername.js`.
  Dots excluded — they read as file extensions in a URL path.
- **D-22:** Length **3–30**. 1–2 characters are squattable premium names; over 30 is unusable as
  a URL.
- **D-23:** Reserved list = app routes (`api`, `account`, `login`, `about`) **plus** a curated
  ~30-word admin-ish set (`admin`, `root`, `support`, `help`, `settings`, `privacy`, `terms`,
  `null`, `undefined`, …). No profanity list — always incomplete, and abuse reporting is already
  a v2 requirement.
- **D-24:** Validation is **server-side** in the claim action so the action and the form cannot
  disagree. Phase 2's FIX-02 fixes the same form's success/failure branch — keep the contract
  stable for it.
- **D-25:** Existing-username migration is moot: the wipe (D-06) removes all claimed usernames.

### Click endpoint hardening (SEC-08)
- **D-26:** `atob(searchParams.get('url'))` is unguarded today — a missing or non-base64 param
  throws a 500. Validate both params and return **400** on malformed input.
- **D-27:** Additionally verify the referenced `page` exists before writing an Event — otherwise
  any stranger can inflate the `Event` collection with arbitrary page names. Combined with the
  60/min IP limit (D-19).

### Refusal UX (SEC-01, 02, 03)
- **D-28:** Distinct status codes with matching toasts: **401** no session, **413** too large,
  **415** disallowed type. `lib/upload.js` already wraps uploads in a toast — extend it rather
  than replacing it.
- **D-29:** Client-side pre-check as well (`accept="image/*"` plus a size check before POST), so
  a 4 MB file is refused without being uploaded. The server check remains the real gate — the
  client one is UX only.

### Code structure
- **D-30:** Gates live in shared helpers under `lib/` (e.g. `lib/rateLimit.js`,
  `lib/requireSession.js`), called explicitly from each write path. **Not** `middleware.js`:
  server actions do not pass through middleware, and middleware runs on the Edge runtime where
  mongoose does not work — a Mongo-backed limiter cannot live there.

### Claude's Discretion
- Exact reserved-word list contents (beyond the named routes and the admin-ish core).
- Helper file naming and function signatures.
- Whether the wipe is a committed script or a one-off run — the planner decides, but it must be
  explicit and reviewable, not an ad-hoc shell command.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning
- `.planning/PROJECT.md` — core value, constraints, Key Decisions table. **Contains a now-reversed
  decision** ("Keep signup open to everyone") that D-01/D-02 supersede; must be updated.
- `.planning/REQUIREMENTS.md` — SEC-01…SEC-08 with verified `file:line` locations for every defect.
- `.planning/ROADMAP.md` — Phase 1 goal, success criteria, and the Vercel/serverless constraint note.

### Code to be modified (all paths relative to `projects/linktree/`)
- `app/api/upload/route.js` — the unauthenticated upload endpoint; no session, size, or MIME check.
- `app/api/click/route.js` — bare `atob()` on a query param (SEC-08).
- `action/grabusername.js` — username claim; also holds a private `mongoose.connect` that Phase 2
  (FIX-09) removes.
- `action/PageAction.js` — `SavePageSetting`, `SavePageButton`, `SavePageLinks`; session-checked
  but unthrottled.
- `app/api/auth/[...nextauth]/route.js` — where the `signIn` allowlist callback goes.
- `lib/upload.js` — the single upload caller; client-side pre-check and toasts.
- `lib/connectToDB.js` — the one connection helper new code must use.
- `models/Page.js`, `models/User.js`, `models/Event.js` — existing schemas; two new models
  (`Upload`, `RateLimit`, `AllowedUser`) join them.

No external ADRs or specs exist for this project — decisions above are the contract.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/connectToDB.js` — idempotent `readyState` guard. Every new collection access uses it; do not
  add a second connection path (Phase 2's FIX-09 removes the one that exists).
- `react-toastify` — already a dependency and already wired into `lib/upload.js`; all refusal
  messaging rides on it, no new UI library.
- `getServerSession(authOptions)` — the established session-read pattern in `action/PageAction.js`;
  the upload route should use the same call rather than inventing another.
- Mongoose model pattern `models?.X || model('X', Schema)` — the hot-reload-safe idiom used by all
  three existing models; new models must follow it.

### Established Patterns
- Two write surfaces exist: **route handlers** (`app/api/*/route.js`) and **`'use server'` actions**
  (`action/*.js`). Any gate must work in both — this is exactly why D-30 rejects middleware.
- `Page.links` and `Page.buttons` are loosely typed `Object` fields. Not touched in this phase, but
  Phases 3 and 4 add fields to them; do not tighten the schema here.
- Uploads are stored as bare URL strings on `User.image`, `Page.bgImage`, and inside
  `Page.links[]` — there is no upload record anywhere. The new `Upload` collection is the first
  place S3 objects become trackable.

### Integration Points
- NextAuth `signIn` callback in `app/api/auth/[...nextauth]/route.js` — the single choke point for
  the allowlist (D-01).
- `lib/upload.js:9` — the only caller of `/api/upload`; client-side pre-check and the new 4xx
  handling both land here.
- The S3 client is constructed inline inside the upload route today. The wipe script and any future
  delete need one too — worth a shared helper, but that is the planner's call.

</code_context>

<specifics>
## Specific Ideas

- The user's framing for invite-only: *"free resource pe sab hai, agar zyada user aa gaye to dikkat
  ho jayegi"* — the concern is cost on free tiers, not privacy. Keep the app looking and behaving
  like a real multi-tenant product; only the signup door is gated.
- The wipe was requested unprompted when asked about grandfathering existing usernames — the user
  wants a clean slate, not a compatibility layer. Plan accordingly: no migration code anywhere in
  this phase.

</specifics>

<deferred>
## Deferred Ideas

- **Admin allowlist page** — add/remove approved emails from the dashboard, gated on `ADMIN_EMAIL`.
  → **Phase 1.5 (INSERTED)**
- **Upload manager UI** — list the owner's uploads with thumbnail and size, delete an upload from
  both S3 and the `Upload` collection to free quota, warn when an image is still in use on the page.
  → **Phase 1.5 (INSERTED)**
- **Auto-delete the previous object on avatar/background replace** — would keep quota from ever
  jamming. Considered and not chosen for Phase 1; revisit alongside the Phase 1.5 delete UI.
- **Content moderation / abuse reporting on uploads** — already tracked as SEC-09/SEC-10 in v2.

</deferred>

---

## Roadmap Amendments — APPLIED 2026-08-09

1. **PROJECT.md** ✓ — "What This Is" now says invite-only; the open-signup Key Decision is struck
   through and replaced with the allowlist decision plus the wipe decision.
2. **REQUIREMENTS.md** ✓ — added `SEC-11` (allowlist) and `SEC-12` (wipe) to the Security section,
   added an "Admin & Upload Management" section (`ADMIN-01/02`, `UPLOAD-01/02`), traceability rows
   for all six, coverage count 33 → 39.
3. **ROADMAP.md** ✓ — **Phase 1.5: Admin & Upload Management (INSERTED)** added with goal, success
   criteria, and `UI hint: yes`. Phase 1's requirement list, success criteria, and notes updated;
   execution order and coverage table updated.

**Phase 1 requirement IDs are now:** SEC-11, SEC-12, SEC-01…SEC-08 (10 total).

---

*Phase: 1-Lock Down Write Paths*
*Context gathered: 2026-08-09*
