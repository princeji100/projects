---
phase: 01-lock-down-write-paths
plan: 07
subsystem: public-write-path
status: complete
completed: 2026-08-13
requirements: [SEC-08, SEC-05]
tags: [validation, rate-limit, analytics-integrity]
requires:
  - lib/rateLimit.js        # 01-03 — checkRateLimit / rateLimitKey
  - models/Page.js
  - models/Event.js
provides:
  - "a /api/click that cannot 500, cannot be flooded, and cannot be made to write a row"
affects:
  - app/(page)/[uri]/page.js  # the only caller — unchanged, its btoa param still passes
tech-stack:
  added: []
  patterns: ["btoa(atob(x)) === x round trip as base64 validation", "existence check via .select('_id').lean()"]
key-files:
  created: []
  modified: [app/api/click/route.js]
decisions:
  - "round trip, not try/catch, is the base64 check — atob accepts junk silently"
  - "presence check sits before atob, because atob(null) never throws"
  - "rate limit runs first here (opposite of 01-06) — the endpoint is unauthenticated, so a flood is the cheap attack"
metrics:
  duration: ~25m
  tasks: 1
  files: 1
commits:
  - 56f6d68  # Task 1: validate params, verify page, rate limit
---

# Phase 01 Plan 07: Harden /api/click Summary

The last unguarded write in the app, and the only one a stranger is *supposed* to reach.
Eleven lines became fifty, and **both** verified defects are fixed — not just the 500 that
SEC-08 names.

## The two bugs, and why fixing one was not enough

| Input | Before | After |
|-------|--------|-------|
| no params at all | **HTTP 200** + `Event { url: 'ée', page: null }` | 400 `Missing parameters`, no row |
| `?url=!!!` | **HTTP 500** (`InvalidCharacterError`) | 400 `Invalid url parameter`, no row |
| `?url=abc` | 200 + `Event { url: 'i·' }` | 400 `Invalid url parameter`, no row |
| `?url=<valid>&page=<nonexistent>` | 200 + row against a page that does not exist | 400 `Unknown page`, no row |
| 61st request in 60s | unbounded | 429 + `Retry-After` |

The missing-param case is the worse of the two and the one a naive fix misses. `atob(null)`
**does not throw** — `null` stringifies to `"null"`, which is valid base64 for `"ée"` — so the
row was written and HTTP 200 returned. Wrapping the decode in a try/catch, the obvious reading
of "SEC-08: malformed input 500s", leaves this live and silent. Nothing surfaces it: no error
log, no failed request, just steadily accumulating garbage in the collection Phase 5's
analytics will report on.

Two things follow, and they are the reusable lesson:

- **The presence check must come before `atob`, not inside its try/catch.** A catch block
  cannot catch a call that succeeds.
- **A try/catch is not base64 validation.** `atob('abc')` returns `"i·"` without complaint.
  `btoa(atob(x)) === x` is the reliable check — `btoa` emits canonical padded base64, so
  anything non-canonical fails the comparison. This is safe for the real caller:
  `app/(page)/[uri]/page.js:119` builds the param with `btoa(link.url)`.

## Gate order

Cheapest first, and every one of them before `Event.create` (line 50, asserted by line number,
not by presence):

| # | Gate | Refusal |
|---|------|---------|
| 1 | `checkRateLimit('click', rateLimitKey('click', null, req))` | **429** + `Retry-After` |
| 2 | `url` or `page` missing/empty — **before any decode** | **400** `Missing parameters` |
| 3 | `atob` throws, or `btoa(atob(x)) !== x` | **400** `Invalid url parameter` |
| 4 | `Page.findOne({ uri: page }).select('_id').lean()` misses | **400** `Unknown page` |
| — | success | 200, body `true` (unchanged, so the caller keeps working) |

**The limiter runs first here, which is the opposite of plan 01-06's claim path — and both are
right.** 01-06 validates first so a malformed username gets its real reason rather than burning
one of five hourly slots; that endpoint is authenticated, so the attacker has already paid for
an account. This one is unauthenticated by design, so an unbounded request rate is the cheap
attack and the limiter is the thing being protected *by*. Limiting first means a flood costs one
Mongo upsert instead of an upsert plus two reads.

`rateLimitKey('click', null, req)` is passed an explicit `null` session — there is none to have —
so it falls through to the first `x-forwarded-for` entry (D-18), or `'unknown'`, which is still
limited rather than skipped.

## Verification Status

Run against a live dev server on `localhost:3000` and live Atlas:

| Check | Result |
|-------|--------|
| `node --env-file=.env scripts/verify-phase1.js --sec08` | **exit 0** — `failures return 400 and write no events row` PASS |
| `npm run build` | **exit 0** |
| curl, all four failure shapes | 400 with the right error string on each (table above) |
| 61 requests in one window | **429**, `retry-after: 44` |
| `atob`/round-trip logic, 6 inputs under bare node | `null`/`""` → missing, `abc`/`aGk` → round-trip fail, `!!!` → throw, valid → decodes |
| `Event.create` (L50) after every guard | asserted by line number |
| `grep -c "mongoose.connect" app/api/click/route.js` | 0 |
| `grep -q "btoa"` / `grep -q "Page.findOne"` | both present |
| `package.json` / `package-lock.json` | unchanged — `atob`/`btoa` are node globals |

**The one criterion not run to green:** the success case, `?url=<valid>&page=<existing uri>` →
200 with exactly one new row. It needs `VERIFY_PAGE_URI`, and the attempt to read an existing
`uri` out of Atlas by hand was refused as an unrequested live-database read. It SKIPs rather
than fails. Every guard on the path to that line was individually proven to reject, so the
untested span is the four lines from `Page.findOne` returning a document to `Event.create`. To
close it:

```bash
npm run dev
VERIFY_PAGE_URI=<an existing page uri> node --env-file=.env scripts/verify-phase1.js --sec08
```

Worth noting this is now the third Phase 1 plan whose live half waits on a value only the user
can supply — see the `VERIFY_SESSION_COOKIE` items still open in STATE.md. Note also that
running the 429 case leaves `ratelimits` documents behind; they TTL out inside a minute.

## Deviations from Plan

None — the plan named both bugs, both orderings and the round-trip check, and all of it held up
under live test. `atob(null) → "ée"` and `atob('abc') → "i·"` were re-confirmed on this machine's
node rather than taken from the plan's notes.

## Out of Scope, Deliberately Left Alone

- **No `GET` handler added.** This `POST` is the whole public write surface.
- **View-event recording is untouched** — `app/(page)/[uri]/page.js:35` writes a view Event for
  profiles that do not exist. Same class of bug, different file, and it belongs to Phase 2's
  FIX-04. `files_modified` is one file and it stayed one file.

## Requirements Satisfied

- **SEC-08** — ROADMAP criterion 7 holds, and then some: a malformed `/api/click` returns 4xx and
  never a 500, *and* never a silent 200 with a garbage row.
- **SEC-05** — ROADMAP criterion 5 is now three quarters real. Upload (01-04), claim (01-06) and
  click (01-07) all call the limiter; only page save (01-08) is left.

## Unblocked By This Plan

Nothing structurally. Phase 5's analytics inherits a cleaner premise: from here on, every row in
`events` references a page that existed at write time.
