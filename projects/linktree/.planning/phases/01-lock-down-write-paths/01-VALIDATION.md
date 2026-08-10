---
phase: 1
slug: lock-down-write-paths
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | **none** — no test framework installed, and none will be installed for this phase (see rationale below) |
| **Config file** | none — Wave 0 creates `scripts/verify-phase1.js` |
| **Quick run command** | `node scripts/verify-phase1.js --units` (pure-logic asserts only, no server needed) |
| **Full suite command** | `npm run dev` in one terminal, then `node scripts/verify-phase1.js` |
| **Estimated runtime** | ~5s units · ~40s full (network round-trips to S3/Atlas dominate) |

**Why no framework.** `package.json` devDependencies are eslint + tailwind only; `scripts` has no
`test`. These requirements are HTTP-boundary and database-behaviour gates — the honest proof is
hitting a running endpoint and reading the status code. A framework would be scaffolding around
`fetch`. Two pure-logic units (`validateUsername`, magic-byte sniffing) get `assert` self-checks
inside the same script.
`ponytail:` single script, no framework — install vitest if this grows past ~300 lines or Phase 2+
needs shared fixtures.

---

## Sampling Rate

- **After every task commit:** `node scripts/verify-phase1.js --units` (fast, no server)
- **After every plan wave:** full suite against a running dev server
- **Before `/gsd:verify-work`:** full suite green + `npm run build` succeeds
- **Max feedback latency:** ~40 seconds

---

## Per-Task Verification Map

*Task IDs cannot be assigned until PLAN.md files exist. This table maps requirements to their
verification command; the planner fills in Task ID / Plan / Wave columns and the plan-checker
enforces the mapping.*

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| TBD | TBD | 1 | SEC-12 | All pre-existing data gone; bucket empty; live sessions invalidated | integration | `node scripts/verify-phase1.js --sec12` | ⬜ pending |
| TBD | TBD | TBD | SEC-11 | Non-allowlisted email cannot sign in; **no row created in `users`** | manual + db | `node scripts/verify-phase1.js --sec11-db` (DB half; browser half manual) | ⬜ pending |
| TBD | TBD | TBD | SEC-01 | `POST /api/upload` without session → 401 | integration | `node scripts/verify-phase1.js --sec01` | ⬜ pending |
| TBD | TBD | TBD | SEC-02 | 4.2 MB → 413; 3.9 MB → 200 (**not** >4.5 MB — that is Vercel's 413) | integration | `node scripts/verify-phase1.js --sec02` | ⬜ pending |
| TBD | TBD | TBD | SEC-03 | SVG → 415; SVG bytes labelled `image/png` → 415; real PNG/JPEG/WEBP → 200 | unit + integration | `node scripts/verify-phase1.js --sec03` | ⬜ pending |
| TBD | TBD | TBD | SEC-04 | Past 25 MB → refusal **and no new S3 object** | integration | `node scripts/verify-phase1.js --sec04` | ⬜ pending |
| TBD | TBD | TBD | SEC-05 | 11th upload in 60s → 429 + `Retry-After`; both indexes present | integration | `node scripts/verify-phase1.js --sec05` | ⬜ pending |
| TBD | TBD | TBD | SEC-06 | `api`/`login`/`admin`/`root` refused with reason | unit | `node scripts/verify-phase1.js --units` | ⬜ pending |
| TBD | TBD | TBD | SEC-07 | 2-char, 31-char, dotted, spaced, emoji refused; `valid_name-3` accepted | unit | `node scripts/verify-phase1.js --units` | ⬜ pending |
| TBD | TBD | TBD | SEC-08 | No params → 400; `?url=!!!` → 400; unknown page → 400; **`Event` count unchanged on every failure** | integration | `node scripts/verify-phase1.js --sec08` | ⬜ pending |

**Cross-cutting, asserted once at end of phase:**

| Check | Why |
|-------|-----|
| `npm run build` exits 0 | Catches the `useSearchParams`/Suspense trap on `/login` (SEC-11) |
| No `mongoose.connect(` outside `lib/connectToDB.js` except the known one in `action/grabusername.js` | Protects Phase 2's FIX-09; stops new code adding a third connection path |

---

## Wave 0 Requirements

- [ ] `scripts/verify-phase1.js` — plain node, `fetch` + `node:assert`, one PASS/FAIL line per
      requirement, flag-gated per SEC-ID so a single gate can be re-checked cheaply
- [ ] Test fixture buffers — real PNG/JPEG/WEBP headers, an SVG, and a `RIFF`-without-`WEBP` blob
      (generated in-script, not committed binaries)
- [ ] Rate-limit window/max must be **injectable** (env or param) so SEC-05's 5/hour claim limit can
      be exercised in seconds rather than an hour
- [ ] No framework install

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Non-allowlisted Google sign-in is refused with the D-03 message | SEC-11 | Requires a real Google OAuth round-trip with a second Google account — cannot be scripted without credentials | Sign in with an account not in `AllowedUser`. Expect redirect to `/login?error=AccessDenied` and the invite-only message rendered. Then run the `--sec11-db` half to confirm no `users` row was created. |
| Live session invalidated by the wipe | SEC-12 | Needs a browser holding a pre-wipe session cookie | Sign in, run the wipe, refresh — expect signed-out. |
| S3 bucket is empty after wipe | SEC-12 | Depends on real S3 credentials + IAM list permission | `--sec12` covers it if the IAM key has `s3:ListBucket`; otherwise verify in the AWS console. See RESEARCH.md § Unresolved — IAM permissions. |
| Toast copy reads correctly for 401/413/415/429 | SEC-01,02,03,05 (D-28) | Visual/UX assertion | Trigger each refusal in the browser; confirm the toast text matches D-16/D-28 wording. |

---

## Validation Sign-Off

- [ ] All tasks have an automated verify or a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers `scripts/verify-phase1.js` + fixtures + injectable rate-limit window
- [ ] No watch-mode flags
- [ ] Feedback latency < 40s
- [ ] Task ID / Plan / Wave columns filled in from PLAN.md
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
