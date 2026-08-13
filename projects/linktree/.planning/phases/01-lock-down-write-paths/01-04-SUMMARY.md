---
phase: 01-lock-down-write-paths
plan: 04
status: complete
completed: 2026-08-13
requirements: [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05]
commits:
  - 75fec2e  # Task 1: session, size and magic-byte gates
  - HEAD     # Task 2: quota, rate limit, Upload record, sec04 loop fix
---

# Summary: Five Gates on /api/upload

The endpoint that made this phase exist. It was open to the internet — any size, any
type, no session — and now nothing reaches S3 without passing five gates.

**Recorded retroactively, and the record was reconstructed from live data.** Task 1 was
committed as `75fec2e`; Task 2 was written but the session ended before commit *or*
summary. On resume the working tree held Task 2 uncommitted, and STATE.md claimed the
code was unverified. **The database said otherwise** — see "How the prior session was
reconstructed" below. This is the second consecutive plan lost to a mid-plan session end;
`git status` is not sufficient on resume, the live collections must be read too.

## Final Gate Order

Cheapest-first, all of them before the S3 put:

| # | Gate | Refusal | Requirement |
|---|------|---------|-------------|
| 1 | `requireSession()` — before `req.formData()` | **401** `Authentication required` | SEC-01, D-09 |
| — | no `file` part | **400** `No file provided` | (was an implicit 200) |
| 2 | `file.size > 4 MB`, read before the stream | **413** `File too large — maximum 4 MB` | SEC-02, D-10 |
| 3 | `detectImageType(buffer)` → null | **415** `Only JPEG, PNG and WEBP images are allowed` | SEC-03, D-13, D-14 |
| 4 | `Upload.aggregate` sum + `file.size > 25 MB` | **413** `Upload limit reached (25 MB) — replace an existing image` | SEC-04, D-11, D-16 |
| 5 | `checkRateLimit('upload', key)` | **429** + `Retry-After` | SEC-05, D-19, D-20 |
| — | `PutObjectCommand` throws | **502** `Upload failed` (detail to server log only) | T-04-08 |
| — | success | **200** with the URL string | |

**Plan 01-07 maps these to toasts — this table is the contract.** Note 413 is
overloaded: too-large and over-quota share a status and are distinguished only by the
error string.

Two orderings are load-bearing and must not be "tidied":

- **Rate limit is last of the gates.** It mutates a counter, so a request already doomed
  by quota must not spend one of the owner's slots.
- **`Upload.create` comes after the put.** Recording first would let a failed put
  permanently burn quota that no object occupies. The reverse leak — an object with no
  record — is recoverable by listing the bucket, which is what Phase 1.5's delete UI
  walks anyway.

## How the prior session was reconstructed

STATE.md said Task 2 was written but never exercised. The `uploads` collection proved it
had been, and against a live server:

```
19:49:46 → 19:50:00   10 records, then stop
19:52:08 → 19:52:31   10 records, then stop
19:53:25 → 19:53:36   10 records, then stop     ← --sec05, three runs, 429 on the 11th
19:56:55 → 19:57:59    6 records of 4089446 B   ← --sec04, halting at 24,537,048 B
```

Three independent runs each stopping at exactly 10 in a 60-second window is the rate
limiter working, end to end, through the route. The gates are not merely written — they
have fired in production shape. **A record of test traffic is evidence; read the
collections before trusting a stale STATE.md.**

## The `--sec04` loop could never have passed

Reconstructing that timeline exposed a bug in the harness, not the route. The fill loop
was:

```js
for (let i = 0; i < 12 && (await sumFor()) < QUOTA; i++) { ... }
assert.ok(await sumFor() >= QUOTA, 'could not reach the 25 MB quota');
```

The stored total can never reach QUOTA, because the gate refuses the very upload that
would cross it. The sum halts at 24,537,048 of 26,214,400 and the assert fails — the
harness was demanding a state its own subject is designed to prevent. Fixed to target
*primed* (`sum + CHUNK > QUOTA`, i.e. "the next upload must be refused") rather than
*crossed*. **A quota test must assert on the refusal, never on the forbidden total.**

## Verification Status

| Check | Result |
|-------|--------|
| `npm run build` | **exit 0** |
| `node scripts/verify-phase1.js --units` | **exit 0**, 0 skipped |
| `node scripts/verify-phase1.js --sec04 --sec05` | exit 0 — both index checks PASS; live halves SKIP, no cookie |
| S3 `ListObjectsV2` against the real bucket | **OK**, 55 keys — first exercised S3 call, credentials confirmed |
| S3 `DeleteObject` (non-existent key probe) | **permitted** |
| Quota `$match`/`$group` aggregate vs live Atlas | returns `[]` → `used = 0` for an unknown owner |
| `uploads` indexes | `_id`, `key` (unique), `owner` — the aggregate is covered |
| `grep -c "file.type\|file.name"` | 0 |
| `grep -c "mongoose.connect\|new S3Client"` | 0 / 0 |
| `Upload.create` (L115) after `PutObjectCommand` (L94) | asserted by line number, not presence |
| Exact D-16 quota string | present verbatim |
| `package.json` / `package-lock.json` | unchanged, no dependency added |

**Still unproven, and it needs a human:** the live `--sec01`…`--sec04` halves and the
`--sec05` 429 case all require `VERIFY_SESSION_COOKIE`, a `next-auth.session-token` from
a signed-in browser. An agent cannot obtain one. The 08-12 traffic is strong evidence
these pass, but the assertions have not been *run* to green.

To close it out:

```bash
npm run dev
# sign in, copy next-auth.session-token from devtools
VERIFY_SESSION_COOKIE=<token> node scripts/verify-phase1.js --sec01 --sec02 --sec03 --sec04 --sec05
```

## Two credential blockers are now resolved

RESEARCH.md unresolved item 2 predicted `AccessDenied` on the first wipe run. Both probes
came back permitted, so **`s3:ListBucket` and `s3:DeleteObject` are already on the IAM
policy** — no policy edit is needed and the 01-01 wipe will not fail on permissions. The
S3 credentials in `.env` are also no longer merely present-but-unverified. `S3_SECRET_KEY`
remains the canonical name; the Wave 1 notes saying `S3_SECRET_ACCESS_KEY` are wrong.

## Surprises Worth Carrying Forward

- **55 S3 objects vs 37 `uploads` records — 18 orphans, 19 MB.** Every orphan predates
  the first record (newest orphan 19:47:23, first record 19:49:01), so they are Task-1-era
  puts from before `Upload.create` existed. **Not a live leak in the shipped code**, and
  the 01-01 wipe removes them. Worth stating plainly because an object-count-vs-row-count
  mismatch is exactly the shape a real quota leak would take, and the next person to look
  will need to know this one is already explained.

- **The owner sits at 24.5 MB of a 25 MB quota, all of it test junk.** The next real
  upload by `princesrivastav216@gmail.com` will be refused. The deferred 01-01 wipe clears
  it; until then this account is effectively out of quota.

- **`ratelimits` is empty** — the TTL index reaped the 08-12 windows, as designed.

- **Bare `node` cannot import `models/*.js`.** They use mongoose named imports
  (`import { model, models, Schema }`), which is fine under Next's bundler but throws
  `SyntaxError: Named export 'models' not found` under plain ESM. Live checks by hand must
  go through `mongoose.connection.db.collection(...)`, not the model.

## Requirements Satisfied

- **SEC-01/02/03** — ROADMAP criterion 3 holds: session, magic-byte-verified type, and a
  server-enforced size cap, all before any S3 call.
- **SEC-04** — ROADMAP criterion 4 holds: an owner at quota gets D-16's refusal with no S3
  object and no row written.
- **SEC-05** — ROADMAP criterion 5 is now *one quarter* real: the limiter is enforced on
  upload. Plans 01-06 (claim), 01-07 (click) and 01-08 (page save) own the rest.

## Unblocked By This Plan

Nothing structurally — 01-05, 01-06 and 01-07 are Wave 3 siblings and were never blocked
on this. Plan 01-07 consumes the status-code table above for its toasts.
