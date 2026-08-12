---
phase: 01-lock-down-write-paths
plan: 03
status: complete
completed: 2026-08-12
requirements: [SEC-05]
commits:
  - 449331f  # Task 1: Upload, RateLimit, AllowedUser models
  - d1146a6  # Task 2: lib/requireSession.js + lib/rateLimit.js
---

# Summary: The Three Collections and the Two Shared Gates

The foundation layer for the rest of Phase 1. Nothing here touches a write path —
it creates the collections and the two helpers that plans 01-04 through 01-08 call
instead of reimplementing. `--sec05` went from red to green.

**Recorded retroactively.** The code was written in the 2026-08-12 session but the
session ended before commit, so the five files were found uncommitted on resume.
Every acceptance criterion was re-verified against the working tree before the
commits below were made — nothing was taken on trust from the prior session.

## Signatures — five call sites depend on these

```js
// lib/requireSession.js
await requireSession()               // → session | null

// lib/rateLimit.js
LIMITS                               // frozen { [action]: { windowMs, max } }
rateLimitKey(action, session, req)   // → `${action}:${email | firstXffIp | 'unknown'}`
await checkRateLimit(action, key)    // → { allowed: boolean, retryAfter: seconds }
```

`requireSession` returns `null` rather than throwing or building a `Response`. Route
handlers need a 401 `Response` and server actions need a returned object, so the
refusal shape belongs to the caller — do not "helpfully" centralise it later.

`rateLimitKey` takes `req` third and tolerates it being `undefined`; server actions
have no request object and fall through to the session email, or `'unknown'`.

`checkRateLimit` takes the **already-derived key**, not the session. Callers pair it
with `rateLimitKey`. `retryAfter` is never 0 — `Retry-After: 0` tells a client to
retry immediately, which is the opposite of the intent.

## What Exists

| Artifact | Provides |
|----------|----------|
| `models/Upload.js` | `{ owner, key, size, url }` + `timestamps`, `owner` index — the quota source of truth (D-12) |
| `models/RateLimit.js` | `{ key, count, expiresAt }`, unique `key` index + per-document TTL on `expiresAt` (D-17) |
| `models/AllowedUser.js` | `{ email }` lowercased/trimmed/unique — the allowlist the signIn callback will read (D-01) |
| `lib/requireSession.js` | The one session read (D-30) |
| `lib/rateLimit.js` | Atomic fixed-window limiter, key derivation, limits (D-17, D-18, D-19) |

Both `RateLimit` indexes are correctness-bearing, not optimisations. Without the
unique `key` index two concurrent lambdas both miss and both insert, producing two
documents for one key — the effective limit silently doubles.

## Verification Status

| Check | Result |
|-------|--------|
| `node scripts/verify-phase1.js --sec05` | **exit 0** — unique `key` index and TTL index both asserted against live Atlas |
| Limiter self-check (15s window, max 3) | `[true,true,true,false,true]` — refuses past max, fresh window after expiry |
| `rateLimitKey` three cases | `upload:a@b.c`, `click:1.2.3.4` (first hop only), `click:unknown` |
| `LIMITS` vs D-19 | exact — upload 10/60000, pageSave 30/60000, claim 5/3600000, click 60/60000 |
| `npm run build` | **exit 0** |
| `grep "mongoose.connect(" lib/` | only `connectToDB.js` |
| `package.json` / `package-lock.json` | unchanged, no dependency added |
| `grep "new Map\|redis\|Redis" lib/rateLimit.js` | 0 (D-17) |

The `--sec05` 429 case still SKIPs — it needs a running server on
`http://localhost:3000`, and no write path enforces the limiter until 01-04.

## Decisions and Deviations

- **E11000 has two causes; the plan specified only one.** The plan says "retry the
  same operation exactly once", which handles a lost insert race — the winner's
  document exists, so re-running the increment finds it. But a **stale** document
  also raises E11000: it fails the `expiresAt: { $gt: now }` filter, so the upsert
  path fires and collides with the document that is already there. Retrying the
  identical query would miss the filter again and raise the same error forever.
  The implementation therefore tries the stale case first — claim the document with
  a `{ expiresAt: { $lte: now } }` filter and reset it to `count: 1` with a fresh
  window — and falls back to the plain retry when nothing matched. Filtering on
  `$lte: now` keeps this safe under concurrency: only one caller can match a given
  stale document, and a fresh one is never touched.

- **The plan's self-check window was too tight, and was corrected in the plan.**
  It hardcoded `RATE_LIMIT_WINDOW_MS=2000`, but four Atlas roundtrips take longer
  than 2s, so the window expires mid-run and the 4th call is *legitimately*
  allowed. The check failed for latency, not logic. `01-03-PLAN.md` now specifies
  15000ms/16s and says why. Any future plan writing a live-DB timing test must
  budget for roundtrip latency, not just the logical window.

- **`lib/rateLimit.js` imports relatively (`./connectToDB.js`), not via `@/`.** The
  self-check runs under plain `node`, which has no bundler to resolve the jsconfig
  alias. Next resolves relative paths identically. `lib/requireSession.js` keeps
  `@/` because it imports from `app/` and is never run outside Next.

- **Fail-open on a limiter DB error**, logged, with a `ponytail:` comment naming
  the ceiling (T-03-05). A Mongo blip must not make the app unusable on a personal
  project; a higher-stakes deployment would fail closed instead.

- **Fixed window, not sliding** (T-03-06). A burst at a window boundary can reach
  2x the limit. D-19's limits have enough headroom that this is irrelevant;
  `ponytail:` comments in both `models/RateLimit.js` and `lib/rateLimit.js` name a
  sliding window as the upgrade path.

- **The override is production-guarded** (T-03-04) and logs once at module load
  when active — otherwise an env var could silently disable every limit on the
  deployed app.

## Surprises Worth Carrying Forward

- **`node --env-file=.env` is required** to run any live-DB self-check by hand.
  Bare `node` does not read `.env`, and because the limiter fails open, a missing
  `MONGODB_URI` produces `[true,true,true,true,true]` — a *passing-looking* result
  that is actually the error path. A timing test that returns all-`true` should be
  suspected of not having reached the database at all.

- **Reusing a fixed self-check key across runs poisons the result.** The window
  from a previous run may still be live. Self-checks must generate a unique key.

## Requirements Satisfied

- **SEC-05** — the limiter exists, is correct across window expiry, and survives
  the concurrent-insert race. **Enforcement is not wired to any write path yet**;
  plans 01-04 (upload), 01-06 (claim), 01-07 (click) and 01-08 (page save) call it.
  ROADMAP criterion 5 has its logic half in place.

## Unblocked By This Plan

Plans 01-04 through 01-08 (Wave 3) — all five call `requireSession` and
`checkRateLimit`. `models/AllowedUser.js` unblocks 01-05, which is what clears
`--sec11-db`.
