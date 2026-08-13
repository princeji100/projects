---
phase: 01-lock-down-write-paths
plan: 06
status: complete
completed: 2026-08-13
requirements: [SEC-06, SEC-07, SEC-05]
commits:
  - dd72b38  # Task 1: gate the claim on session, validation and rate limit
---

# Summary: The Username Claim Is Gated

`action/grabusername.js` validated nothing but presence and uniqueness, so `api`, `a`,
`Bad.Name` and an emoji were all claimable public URLs. It now refuses each with the
validator's own reason and throttles claims at 5/hour.

## The Return Contract — Phase 2 FIX-02 depends on this

`handleFormSubmit(formdata)` returns, on **every** path:

```js
{ success: true,  data: { uri, owner, _id, createdAt, updatedAt, __v } }
{ success: false, error: string }                        // all refusals
{ success: false, error: string, retryAfter: number }    // rate-limited only
```

No path returns `undefined` any more. The old bare `return` at line 14 was a latent
crash — `components/forms/UserNameForm.js:24` reads `result.success` unconditionally,
so submitting an empty field threw on a property of `undefined`.

`retryAfter` (whole seconds) appears **only** on the rate-limit refusal. Callers must
treat its absence as normal, not as a missing field.

## Refusal Order

Cheapest and most informative first; the database is not touched until all four pass.

| # | Gate | Refusal |
|---|------|---------|
| 1 | username present | `Username is required` |
| 2 | `requireSession()` | `Authentication required` |
| 3 | `validateUsername()` | the validator's message, passed straight through |
| 4 | `checkRateLimit('claim', key)` | `Too many attempts — please try again later` + `retryAfter` |
| 5 | `Page.findOne({uri})` | `Username already taken` |

**The limiter sits after validation on purpose.** The 5/hour limit exists to stop
username enumeration, and enumeration needs well-formed names — so a typo should get
its real reason rather than burn one of five hourly slots. It sits *before* the
uniqueness query so an attacker cannot probe the namespace for free.

**The session check moved above the connection block.** It previously ran after
`mongoose.connect`, meaning an unauthenticated stranger opened a database connection
before being refused.

## Verification Status

| Check | Result |
|-------|--------|
| `node scripts/verify-phase1.js --units` | **exit 0** — 21 PASS, 0 fail, 0 skip |
| `npm run build` | **exit 0**, 12/12 static pages |
| `grep -c 'mongoose.connect' action/grabusername.js` | **1** — Phase 2's FIX-09 line untouched |
| `grep -c 'return;' action/grabusername.js` | **0** — no bare returns |
| `grep -rn 'a-z0-9_-' action/ components/` | **nothing** — the charset rule exists only in `lib/username.js` (D-24) |
| `grep -c 'a-z0-9_-\|RESERVED' action/grabusername.js` | **0** |
| Claim limiter self-check (`RATE_LIMIT_WINDOW_MS=20000 RATE_LIMIT_MAX_OVERRIDE=3`) | `[true,true,true,false]`, `retryAfter: 20`, key `claim:<email>` |

The charset/length/reserved acceptance cases (`ab`, `a`×31, `Bad.Name`, `has space`,
`emoji🎉`, `valid_name-3`, `api`/`login`/`admin`/`root`) are exactly what `--units`
asserts against `validateUsername`, which is now the action's only rule source — there
is no second implementation left in the action that could disagree with it.

**Not run here:** the end-to-end browser claim. It needs a signed-in session cookie, and
plan 01-05's allowlist gate is itself still at a human-verify checkpoint, so no account
can currently complete sign-in on a clean database. Carried on the existing
"run the cookie-gated verifier halves" todo.

## Decisions and Deviations

- **Used `requireSession()` instead of the inline `getServerSession` + `session?.user?.email`
  pair.** D-30 wants one session read across the phase, and `/api/upload` already routes
  through it. The refusal message is unchanged, so the caller sees no difference.
- **Dropped three `console.log`/`console.error` lines** on paths that now return a
  structured error (no-username, username-taken, page-saved). The returned object is the
  signal; logging every refused claim turns an enumeration attempt into log spam. The
  genuine-fault logs (`Page model is undefined`, the catch) stayed.
- **`lib/connectToDB.js` was ultimately not imported.** The plan allowed it for new code,
  but no new code needed a connection — `checkRateLimit` opens its own via
  `connectToDB.js` internally, and the uniqueness query still runs behind the pre-existing
  `isConnected` block. Adding a second import for nothing would have been the divergence
  FIX-09 exists to remove. The `mongoose.connect` block is untouched, count still 1.
- **`rateLimitKey('claim', session)` is called with two arguments.** A server action has no
  request object; `lib/rateLimit.js` already tolerates `req === undefined` and falls through
  to the session email, which gate 2 guarantees is present. The key is never `claim:unknown`
  on this path.
- **`ponytail:` comment added** naming why `retryAfter` is a returned field here while
  `/api/upload` sends a `Retry-After` header — server actions cannot set headers. The two
  shapes are deliberate, not drift.

## Threat Register Outcome

| Threat | Status |
|--------|--------|
| T-06-01 route shadowing | mitigated — `RESERVED_USERNAMES` (45 entries) checked before any write |
| T-06-02 traversal/delimiter chars | mitigated — `^[a-z0-9_-]+$`, dots excluded |
| T-06-03 enumeration | mitigated — 5/hour per session email, verified refusing at max+1 |
| T-06-04 1-2 char squatting | mitigated — min length 3 |
| T-06-05 unauthenticated claim | mitigated — session check now runs before the connection, not after |
| T-06-06 "name taken" disclosure | accepted, as planned — bounded by T-06-03 |
| T-06-07 form/action divergence | mitigated — zero rules duplicated in the action |
| T-06-SC npm installs | mitigated — no dependency added, `package.json`/`package-lock.json` untouched |

## Left For Later

- **The form still ignores the reason.** `UserNameForm.js:24` does
  `if (result) router.push(...)` — an object is always truthy, so it redirects to the
  success page even on a refusal, and `UserNameFormResult` renders no message. That is
  Phase 2's FIX-02 (a listed Active requirement, "Username claim does not redirect to the
  success page when the name was taken"), explicitly out of this plan's `files_modified`.
  **The server-side gate is real regardless** — no invalid document is created; the user
  just is not shown why yet. The contract above is what FIX-02 will read.
- `retryAfter` → toast mapping is plan 01-07's.

## Requirements Satisfied

- **SEC-06** — reserved usernames refused at claim time with the reason returned.
- **SEC-07** — charset and 3–30 length enforced server-side from the shared module.
- **SEC-05** — the claim path is the second of four write paths wired to the limiter
  (after 01-04's upload). 01-07 and 01-08 remain.

ROADMAP criterion 6 holds server-side. Its "with the reason shown" half is complete at
the action; surfacing it in the UI is FIX-02.

## Self-Check: PASSED

- `action/grabusername.js` — FOUND (modified)
- `.planning/phases/01-lock-down-write-paths/01-06-SUMMARY.md` — FOUND
- commit `dd72b38` — FOUND
