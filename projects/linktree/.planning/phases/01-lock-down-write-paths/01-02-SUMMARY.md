---
phase: 01-lock-down-write-paths
plan: 02
status: complete
completed: 2026-08-12
requirements: [SEC-03, SEC-06, SEC-07]
commits:
  - 60abaad  # Task 1: lib/magicBytes.js + lib/username.js
  - 4d6f833  # Task 2: verify-phase1.js unit half
  - c4d4bd2  # Task 3: verify-phase1.js integration half
---

# Summary: Gate Modules and the Phase 1 Verification Harness

Built the two pure-logic gate modules and the harness that proves every SEC-ID in
this phase. Written before the write paths are touched, so plans 01-04 through
01-08 are verified by checks that already exist.

## What Exists

| Artifact | Provides |
|----------|----------|
| `lib/magicBytes.js` | `detectImageType(buffer)` → `{mime, ext}` or `null`. Reads ≤12 bytes. Zero dependencies. |
| `lib/username.js` | `validateUsername(name)` → `{ok}` / `{ok:false, error}`, plus `RESERVED_USERNAMES`. |
| `scripts/verify-phase1.js` | Nine flag-gated checks: `--units` plus eight integration flags. |

## Verification Status

- `node scripts/verify-phase1.js --units` → **exit 0**, 0 failures, 0 skipped
- Bare environment (`.env` removed, all eight integration flags) → **exit 0**, 8 SKIPs, no crash
- `npm run build` → **exit 0** (no `useSearchParams`/Suspense trap on `/login`)
- `package.json` / `package-lock.json` → byte-identical, no dependency added
- `grep "mongoose.connect(" lib/` → only `connectToDB.js`
- Mutation-tested: removing `api` from `RESERVED_USERNAMES` flips `--units` to exit 1

Three flags **legitimately fail** against live Atlas right now. They are contracts,
red until the plan that implements them lands:

| Flag | Why red | Cleared by |
|------|---------|-----------|
| `--sec05` | `ratelimits` collection does not exist | plan 01-03 |
| `--sec11-db` | `allowedusers` collection does not exist | plan 01-05 |
| `--sec12` | `pages` holds 6 rows — the wipe has not run | plan 01-01 (deferred) |

## RESERVED_USERNAMES — final contents (45)

Real `app/` route segments enumerated from disk, first five:
`api` `account` `analytics` `about` `login`

Curated admin-ish set:
`admin` `administrator` `root` `superuser` `support` `help` `contact` `settings`
`config` `privacy` `terms` `legal` `security` `billing` `signup` `signin`
`signout` `logout` `register` `auth` `oauth` `dashboard` `profile` `user`
`users` `me` `static` `public` `assets` `favicon` `robots` `sitemap` `null`
`undefined` `true` `false` `test` `new` `edit` `delete`

No profanity list (D-23 — always incomplete, and abuse reporting is a v2
requirement). Adding a new top-level `app/` route later **requires** adding it
here; a collision with an already-claimed username is unrecoverable.

## Environment Read by the Harness

All optional — absence produces a printed SKIP, never a crash.

| Variable | Used by | Absent behaviour |
|----------|---------|------------------|
| `MONGODB_URI` | sec04, sec05, sec08, sec11-db, sec12 | `SKIP: no MONGODB_URI` |
| `BUCKET_NAME` | sec01 delta, sec04, sec12 | bucket assertion skipped |
| `VERIFY_BASE_URL` | all HTTP flags | defaults `http://localhost:3000` |
| `VERIFY_SESSION_COOKIE` | sec01–sec05 authenticated cases | `SKIP: no VERIFY_SESSION_COOKIE` |
| `VERIFY_DENIED_EMAIL` | sec11-db denied-user case | that one check skipped |
| `VERIFY_PAGE_URI` | sec08 success case | success case skipped |
| `RATE_LIMIT_WINDOW_MS` | sec05 | plan 01-03 honours the override |
| `RATE_LIMIT_MAX_OVERRIDE` | sec05 | defaults to 10 |

`.env` is loaded with stdlib `process.loadEnvFile` (node 20.6+) — no `dotenv`
dependency, and a missing `.env` is caught and ignored.

## Decisions and Deviations

- **Multipart bodies are hand-built**, not `FormData`. SEC-03's spoof case needs
  the part's declared `Content-Type` set independently of the bytes; `FormData` +
  `Blob` makes that awkward. The hand-built body is what makes "SVG bytes labelled
  `image/png`" expressible.
- **`lib/s3.js` is imported dynamically** inside `bucketKeyCount()`. It does not
  exist yet — plan 01-01 creates it, and 01-01 is a deferred irreversible wipe. A
  missing module returns `null` → SKIP, rather than throwing at module load.
  Marked with a `ponytail:` comment naming the 01-01 dependency. It was
  deliberately **not** created here: pre-empting a destructive-wipe plan is how
  production gets deleted by accident.
- **`skip()` moved outside `check()`** in two places (sec01 bucket delta, sec12
  bucket). Calling it inside the callback printed a SKIP line and then a
  misleading PASS for the same check.
- **Failure messages truncated to their first line.** `node:assert` emits
  multi-line diffs, which broke VALIDATION.md's one-line-per-check format.
- **No `>4.5 MB` upload case**, by design. Vercel refuses those at the platform
  before the handler runs, so such a test would prove something about Vercel, not
  about our 4 MB gate. SEC-02 asserts the 4.2 MB / 3.9 MB pair instead.

## Surprises Worth Carrying Forward

- **`node_modules` was half-installed.** 242M on disk, but ~half the packages were
  empty directories — including `bson`, so *any* mongoose import died at load.
  `npm install` repaired it without touching either manifest. Worth suspecting
  first if a future session sees an inexplicable `Cannot find module`.
- **`app/api/click/route.js` is worse than the plan assumed.** It calls
  `atob(searchParams.get('url'))` with no guard, so a missing `url` throws inside
  the handler, and `Event.create` runs before any validation. The `events`-count
  assertion in `--sec08` is the part that catches this; a status-only check would
  not. Plan 01-07 owns the fix.
- **`app/api/upload/route.js` reads `process.env.S3_SECRET_KEY`**, while the
  handoff and human-action list both say `S3_SECRET_ACCESS_KEY`. Whichever name
  Wave 1 standardises on, these two must agree or the wipe authenticates against
  undefined credentials.

## Requirements Satisfied

- **SEC-03** — logic half complete (`detectImageType`, magic bytes authoritative
  over declared type). HTTP enforcement is plan 01-04.
- **SEC-06** — `api`/`login`/`admin`/`root` refused with a reason. Claim-path
  enforcement is plan 01-06.
- **SEC-07** — charset and 3–30 length boundaries refused/accepted as specified.

ROADMAP criteria 3 and 6 have their logic halves in place.
