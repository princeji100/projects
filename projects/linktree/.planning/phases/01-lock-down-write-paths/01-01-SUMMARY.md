---
phase: 01-lock-down-write-paths
plan: 01
status: complete
completed: 2026-08-13
requirements: [SEC-12]
commits:
  - 4dc7e9c  # Task 1: extract the S3 client into lib/s3.js
  - 9e334f0  # Task 2: scripts/wipe.js, flag-gated
  - (this)   # Task 3 human-verify + s3.js timeout raise
---

# Summary: The Destructive Wipe and the Shared S3 Client

SEC-12. The app now starts from a genuinely empty state: every pre-existing page,
user, event, account, session and S3 object is gone. Every later plan in this phase
is written against an empty database — no upload backfill (D-08), no username
migration (D-25), no stale sessions surviving the new allowlist.

Executed out of wave order relative to 01-02/01-03, which landed first while this
plan was deferred waiting on credentials. Harmless: this plan touches no file they
touch, and its only shared output (`lib/s3.js`) had no consumer until now.

## What Exists

| Artifact | Provides |
|----------|----------|
| `lib/s3.js` | `s3Client` + `BUCKET_NAME` — the only `new S3Client` site in the codebase |
| `scripts/wipe.js` | One-shot destructive wipe, refuses without `--yes-destroy-everything` |

`app/api/upload/route.js` lost its inline client and now imports both. Phase 1.5's
delete UI reuses `lib/s3.js` rather than anything in the wipe script.

## Task 3 — the wipe, run by the user 2026-08-13

Verified after the fact against live infrastructure, not taken on report.

| Collection | Before | After wipe + re-claim |
|-----------|--------|----------------------|
| `pages` | 6 | 1 |
| `users` | 6 | 1 |
| `events` | 195 | 1 |
| `accounts` | 6 | 1 |
| `sessions` | 9 | 1 |
| `ratelimits` | 0 | 0 (spared by design) |
| S3 `linktreeaws` | 6 objects | **KeyCount 0** |

The `1`s are not wipe survivors — they are the re-claim. Dropping `sessions` signed
the owner out, who then signed back in (user + account + session) and re-claimed the
username (page). That sign-out is itself the proof the database-session half of
SEC-12 worked, which a JWT strategy could not have delivered.

**`node scripts/verify-phase1.js --sec12` now FAILS, and that is correct.** It asserts
`pages` is empty, which stopped being true the instant the owner re-claimed. The flag
proves the wipe only in the window between the wipe and the re-claim. Do not "fix" it
by relaxing the assertion — SEC-12 is a one-time state transition, and the evidence
is this table, not a flag that can be re-run.

## Decisions and Deviations

- **`ratelimits` is deliberately NOT dropped.** It existed (0 docs) at wipe time, but
  dropping a collection drops its indexes, and 01-03's unique-`key` and TTL indexes are
  correctness-bearing — without the unique index the effective rate limit silently
  doubles. Not in the plan; the plan predated 01-03 landing.

- **`DeleteObjects` per-key errors abort the run.** S3 reports per-key failures in the
  response body rather than throwing, so counting `Deleted.length` alone would report a
  clean wipe over a partial one.

- **The flag gate is the first statement after the imports** — before any env read or
  connection, so an unflagged run cannot touch anything. Proven by running it: exit 1,
  `Nothing was touched.`, all collections still present.

- **`lib/s3.js` timeouts raised twice.** 15s (set during Task 1) still produced
  `TimeoutError` on two consecutive post-wipe list calls. Now 60s connect / 120s request
  with `maxAttempts: 5`, which succeeded first try. Marked `ponytail:` — tuned to an
  observed-slow home connection, and Vercel sits far closer to eu-north-1.

## Surprises Worth Carrying Forward

- **A TimeoutError from S3 reads exactly like the AccessDenied this phase predicted.**
  RESEARCH.md forecast an IAM failure on first contact; what actually happened was a
  network timeout, twice, from a working policy. `curl` to the same endpoint answered
  in ~1s while the SDK timed out — so **when S3 misbehaves, curl the endpoint before
  suspecting IAM.** The IAM policy was fine all along: both `s3:ListBucket` and
  `s3:DeleteObject` were already granted, and RESEARCH.md unresolved item 2 is closed.

- **There is exactly one `users` collection**, shared by Mongoose's `User` model and the
  NextAuth adapter — the collision RESEARCH.md predicted is confirmed. One drop handled
  both. Anything later that touches `users` is touching both consumers at once.

- **`scripts/wipe.js` is deliberately not an npm alias.** Nothing this destructive should
  be one tab-completion away from `npm run build`.

## Requirements Satisfied

- **SEC-12** — complete. ROADMAP criterion 2 ("pre-existing Pages, Users, Events, adapter
  collections, and S3 objects are gone — the app starts from an empty state") is met and
  evidenced above.

## Unblocked By This Plan

Wave 3 in full — 01-04, 01-05, 01-06, 01-07. 01-04 imports `lib/s3.js` and will be the
first code to exercise the S3 credentials in anger under the new gates.
