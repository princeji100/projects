# Phase 1: Lock Down Write Paths - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-09
**Phase:** 1-Lock Down Write Paths
**Areas discussed:** Upload quota shape, Signup gate, Scope split, Rate limit mechanism, Username rules, Data wipe, Refusal UX + click hardening, MIME/type/ACL, Code structure

---

## Upload quota shape

| Option | Description | Selected |
|--------|-------------|----------|
| Total bytes per user | Maps directly to the S3 bill; needs an Upload collection | ✓ (on the re-ask) |
| File count per user | Easy to count, weak relation to cost | |
| Uploads per day (rolling) | TTL counter only, no lifetime cap | |

**User's choice:** Initially answered with a question — *"1 rakhta ha ya kasa handel kara, isa invite only rakhla kya kyuki free resource pa sab ha, agar jada user agya to dikkat hojaygi"* — which opened the signup-gate area below. Re-asked after invite-only was locked; chose total bytes / 25 MB.
**Notes:** The user's instinct was that per-user quota bounds cost per user but not the number of users. That reframing drove the invite-only decision.

---

## Cap size

| Option | Description | Selected |
|--------|-------------|----------|
| 4 MB/file, 25 MB/user | Sits under Vercel's ~4.5 MB serverless body limit | ✓ |
| 2 MB/file, 10 MB/user | Stricter | |
| 5 MB/file, 50 MB/user | Close to the platform limit; confusing failures | |

**User's choice:** 4 MB/file, 25 MB/user
**Notes:** —

---

## Signup gate (emerged mid-discussion)

| Option | Description | Selected |
|--------|-------------|----------|
| Allowlist — approved emails only | NextAuth signIn callback + AllowedUser collection | ✓ |
| Keep open, quota is enough | Original PROJECT.md decision; N users unbounded | |
| Open with a total user cap | Auto-managed, but anyone can take a slot | |
| Single personal account | Cheapest, kills the multi-tenant portfolio story | |

**User's choice:** Allowlist
**Notes:** This **reverses a locked PROJECT.md decision**. Flagged to the user at the time. Rationale is cost on free tiers, not privacy — the app should still read as a real multi-tenant product.

---

## Allowlist management

| Option | Description | Selected |
|--------|-------------|----------|
| Mongo collection, manual insert | Zero UI code, shortest diff | |
| Env var comma-separated list | Cheapest, needs a redeploy per user | |
| Admin page in dashboard | Add/remove from the UI | ✓ |

**User's choice:** Admin page
**Notes:** Flagged as a new UI surface in a backend phase — led directly to the scope-split question.

---

## Denied sign-in UX

| Option | Description | Selected |
|--------|-------------|----------|
| Clear message on the login page | Handles `?error=AccessDenied` | ✓ |
| Default NextAuth error page | No code, but reads as a broken app | |

**User's choice:** Clear message on the login page
**Notes:** Matters because recruiters open the live link.

---

## Quota-full behaviour

| Option | Description | Selected |
|--------|-------------|----------|
| Clear error only | No delete UI in Phase 1 | |
| Auto-delete previous object on replace | Quota never jams | |
| Add a delete UI | Full media manager | ✓ |

**User's choice:** Delete UI
**Notes:** Second new UI surface — reinforced the need for a scope split.

---

## Scope split

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the UI in Phase 1 | One phase, larger | |
| New Phase 1.5 for the UI | Phase 1 stays backend-only and ships sooner | ✓ |
| Push the UI to the end | Manual DB inserts until then | |

**User's choice:** New Phase 1.5
**Notes:** Phase 1 = backend gates. Phase 1.5 (INSERTED) = admin allowlist page + upload manager UI.

---

## Admin identity

| Option | Description | Selected |
|--------|-------------|----------|
| `ADMIN_EMAIL` env var | One line, no role system | ✓ |
| `isAdmin` flag on AllowedUser | Multiple admins; seed admin still manual | |

**User's choice:** Env var
**Notes:** —

---

## Delete UI capability

| Option | Description | Selected |
|--------|-------------|----------|
| List + delete from S3 and DB | Frees quota; warns when an image is in use | ✓ |
| List only, no delete | Half the job | |

**User's choice:** List + delete
**Notes:** Deferred to Phase 1.5.

---

## Rate limit storage

| Option | Description | Selected |
|--------|-------------|----------|
| Mongo collection + TTL index | No cleanup code; matches the roadmap note | ✓ |
| In-memory Map per lambda | Per-instance, trivially bypassed on serverless | |
| New dependency (upstash) | New external service against an explicit constraint | |

**User's choice:** Mongo + TTL
**Notes:** —

---

## Rate limit key

| Option | Description | Selected |
|--------|-------------|----------|
| Session email when authed, IP when not | Covers the public `/api/click` too | ✓ |
| Per-user only | Leaves `/api/click` unbounded | |
| Per-IP only | False-blocks users behind shared NAT | |

**User's choice:** Email, falling back to IP
**Notes:** —

---

## Rate limits

| Option | Description | Selected |
|--------|-------------|----------|
| upload 10/min, save 30/min, claim 5/hr | Claim strict — enumeration path | ✓ |
| 20/min everywhere | One constant; claim still enumerable | |
| 60/min everywhere | Never false-blocks; weak | |

**User's choice:** Tiered limits; click 60/min per IP
**Notes:** —

---

## Limit-hit response

| Option | Description | Selected |
|--------|-------------|----------|
| 429 + Retry-After + toast | Standard; react-toastify already present | ✓ |
| 429 with no header | Client cannot tell when to retry | |
| Silent 200 | Looks like data loss to a legit user | |

**User's choice:** 429 + Retry-After + toast
**Notes:** —

---

## Username rules

| Option | Description | Selected |
|--------|-------------|----------|
| `a-z 0-9 _ -` | URL-safe, no dots | ✓ |
| `a-z 0-9` only | Blocks `john-doe` | |
| Allow dots | Reads as a file extension | |

**Length:** 3–30 ✓ (vs 2–50, 4–20)
**Reserved list:** app routes + curated admin-ish set (~30 words) ✓ (vs routes only, vs 100+ with profanity)
**User's choice:** As marked
**Notes:** —

---

## Existing data / wipe

| Option | Description | Selected |
|--------|-------------|----------|
| Rules apply to new claims only | Safest; existing URLs untouched | |
| Report violators, decide later | Extra work, informative | |
| — | — | |

**User's choice:** Free-text — *"jobhi users ha sab hata sakta ho, purana data delete kar sakta ho"*, then confirmed **full wipe: Pages, Users, Events, S3 — at the start of Phase 1**, over the offered alternatives (wipe non-allowlist users only / wipe at the end / count first).
**Notes:** Confirmed as irreversible, including the owner's own page. Consequence: the Upload backfill decision is void — there is nothing left to backfill.

---

## Upload refusal UX

| Option | Description | Selected |
|--------|-------------|----------|
| Distinct 4xx + specific toasts (401/413/415) | User learns what to fix | ✓ |
| One generic "Upload failed" | Less code, less useful | |

**Client-side pre-check:** both client and server ✓ (vs server only)
**User's choice:** As marked
**Notes:** Server remains the real gate; the client check is UX only.

---

## Click endpoint hardening

| Option | Description | Selected |
|--------|-------------|----------|
| Validate + 400, plus a page-exists check | Stops junk Event inflation | ✓ |
| Validate + 400 only | Literal SEC-08, junk still writable | |
| Require a session | Breaks public click tracking | |

**User's choice:** Validate + page-exists check
**Notes:** —

---

## MIME allowlist / type verification / S3 ACL

| Option | Description | Selected |
|--------|-------------|----------|
| jpeg, png, webp — no SVG | SVG is stored XSS on a public-read bucket | ✓ |
| + gif | Larger files, rarely needed | |
| all `image/*` | Client can lie about Content-Type | |

**Type verification:** magic bytes ✓ (vs trusting `file.type`, vs adding `file-type`)
**S3 ACL:** keep `public-read` ✓ (vs private + presigned URLs)
**User's choice:** As marked
**Notes:** Presigned URLs would break `next/image` caching on the public page.

---

## Code structure

| Option | Description | Selected |
|--------|-------------|----------|
| Shared `lib/` helpers called explicitly | Works for both routes and server actions | ✓ |
| `middleware.js` | Server actions bypass it; mongoose fails on Edge | |
| Inline per route | Five copies of the same logic | |

**User's choice:** Shared `lib/` helpers
**Notes:** —

---

## Claude's Discretion

- Exact contents of the reserved-word list beyond the named routes and the admin-ish core.
- Helper file naming and function signatures.
- Whether the wipe ships as a committed script or a one-off run — must be explicit and reviewable either way.

## Deferred Ideas

- Admin allowlist page → Phase 1.5 (INSERTED)
- Upload manager UI with delete → Phase 1.5 (INSERTED)
- Auto-delete the previous S3 object on avatar/background replace → revisit with the Phase 1.5 delete UI
- Content moderation / abuse reporting → already SEC-09/SEC-10 in v2
