---
phase: 01-lock-down-write-paths
plan: 05
subsystem: auth
status: complete
completed: 2026-08-14
requirements: [SEC-11]
tags: [auth, allowlist, invite-only]
requires:
  - models/AllowedUser.js     # 01-02 — the model
  - lib/connectToDB.js        # shared DB connection
provides:
  - "signIn callback that refuses emails absent from AllowedUser"
  - "invite-only refusal message on /login?error=AccessDenied"
  - "scripts/seedAllowlist.js for manual allowlist insertion"
affects:
  - app/api/auth/[...nextauth]/route.js
  - app/(default)/login/page.js
tech-stack:
  added: []
  patterns: ["NextAuth signIn callback as allowlist gate", "useSearchParams inside Suspense boundary"]
key-files:
  created:
    - scripts/seedAllowlist.js
  modified:
    - app/api/auth/[...nextauth]/route.js
    - app/(default)/login/page.js
    - .planning/PROJECT.md
decisions:
  - "signIn fails CLOSED — a DB error returns false, refusing the user rather than admitting a stranger (opposite of the rate limiter's fail-open)"
  - "The refusal message is identical for every refused email — it says the app is invite-only, never whether that specific address exists"
  - "Phase 1 is insert-only for the allowlist; removal needs the session cleanup that Phase 1.5 owns"
  - "PROJECT.md D-02 reversed: signup is no longer open to anyone with a Google account"
metrics:
  tasks: 3
  files: 3
commits:
  - 01e7b3a  # Task 1: gate sign-in on AllowedUser allowlist
  - 1c790ce  # Task 2: show invite-only refusal on /login, add seed script
  - adc2268  # Task 3: record allowlist reversal in PROJECT.md
---

# Phase 01 Plan 05: Invite-Only Signup Summary

Signup is now gated by an email allowlist. Any Google account not in the `AllowedUser`
collection is refused at the `signIn` callback level and lands on `/login?error=AccessDenied`
with the message: **"This app is invite-only — contact the owner for access."**

## Implementation

### signIn Callback Gate
In `app/api/auth/[...nextauth]/route.js`, the `signIn` callback calls
`AllowedUser.findOne({ email: profile.email.toLowerCase() })`. If absent, it returns `false`,
which NextAuth translates to a redirect to `pages.error` → `/login?error=AccessDenied`.

The gate fails **closed**: a DB error returns `false` rather than admitting a stranger. This is
the deliberate opposite of the rate limiter's fail-open, because an accidental admission creates
a permanent user row while an accidental refusal is just a retry.

### Login Page Refusal Message
`app/(default)/login/page.js` reads `?error=AccessDenied` via `useSearchParams()` inside a
`<Suspense>` boundary (required by Next.js 15 for client-side search params in a server
component tree). The copy is generic by design — it never reveals whether a specific email is on
the allowlist.

### Seed Script
`scripts/seedAllowlist.js` inserts emails via `updateOne` with `$setOnInsert` + `upsert`, making
it idempotent and case-insensitive. This is the entirety of Phase 1's allowlist management; the
admin UI is Phase 1.5.

## Verification Status

| Check | Result |
|-------|--------|
| `npm run build` | **exit 0** |
| `node --env-file=.env scripts/verify-phase1.js --sec11-db` | **PASS** (allowedusers non-empty after seeding) |
| Non-seeded Google account refused | **Confirmed** — user hit the invite-only message in browser |
| Seeded account can sign in | **Confirmed** — user seeded their email and signed in |
| `grep -rn "mongoose.connect(" app/api/auth/` | 0 hits (uses connectToDB) |

### Step 5 result (adapter ordering)
Not explicitly tested with a second denied account against the `users` collection in this session.
The `--sec11-db` PASS confirms the allowedusers collection is correctly populated. The question of
whether NextAuth v4's MongoDBAdapter creates a `users` row before the `signIn` callback runs
remains open — if it does, SEC-11 can claim "refused sign-in" but not "no row created". This is
recorded for Phase 1.5's awareness.

## Deviations from Plan

One deviation recorded during execution: `models/AllowedUser.js` used named mongoose imports
(`import { Schema, model } from 'mongoose'`), which plain-node ESM cannot resolve. Switched to
the default-import destructure pattern (`import mongoose from 'mongoose'; const { Schema, model }
= mongoose;`) that `models/RateLimit.js` already uses. Fixed in the model, not the script, so
future out-of-Next consumers don't hit it again.

## Requirements Satisfied

- **SEC-11** — ROADMAP criterion: an email absent from the allowlist cannot sign in and is told the
  app is invite-only. Confirmed by the user encountering the refusal in their browser.
