# Linktree

## What This Is

A multi-tenant link-in-bio app — anyone signs in with Google, claims a username, and gets a public
profile page at `/username` with their links, social buttons, avatar, and background. Owners get a
dashboard to edit the page and see view/click analytics.

It serves two purposes at once: a portfolio piece that recruiters and freelance clients will open
and judge, and an app Prince actually uses in place of the real Linktree.

## Core Value

A stranger opens `/username` and sees a page that loads fast, looks good, and whose links work —
every time, without the owner having to check on it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from the existing codebase, live at
     https://linktree-princeji.vercel.app/ -->

- ✓ Google sign-in via NextAuth v4 + MongoDBAdapter — existing
- ✓ Username claim flow with uniqueness check — existing
- ✓ Public profile page at `/[uri]` (avatar, display name, location, bio, links, social buttons) — existing
- ✓ Dashboard at `/account` to edit page settings, buttons, and links — existing
- ✓ Drag-to-reorder links and buttons in the dashboard (react-sortablejs) — existing
- ✓ Image upload to S3 for avatar, background, and per-link icons — existing
- ✓ Background as either solid color or uploaded image — existing
- ✓ 16 social button types with correct link schemes (tel:, mailto:, wa.me) — existing
- ✓ View and click tracking via the Event model — existing
- ✓ Analytics page with a views-over-time chart and per-link click counts — existing

### Active

**Security — the app is publicly open to signup, so these gate everything else**

- [ ] `/api/upload` requires an authenticated session
- [ ] Uploads enforce a file size cap and an image MIME allowlist
- [ ] Per-user upload quota so one account cannot drain the S3 bucket
- [ ] Rate limiting on write endpoints (upload, page save, username claim)
- [ ] Reserved usernames blocked (`account`, `login`, `api`, `about`, admin-ish words)
- [ ] Username format validated (charset, length) before it becomes a public URL

**Correctness — bugs confirmed by reading the code this session**

- [ ] `SavePageLinks` reports success accurately (currently returns false on success)
- [ ] Username claim does not redirect to the success page when the name was taken
- [ ] Unknown `/username` returns a real 404 instead of a 500
- [ ] No view Event is written for a profile that does not exist
- [ ] Missing avatar/background images do not crash `next/image`
- [ ] `params` awaited per the Next 15 async API
- [ ] Analytics link rows use stable React keys
- [ ] Social button icon colors actually render (dynamic Tailwind classes are purged today)
- [ ] One MongoDB connection path, not two

**Features**

- [ ] QR code for the profile page — displayed and downloadable
- [ ] Theme presets applied in one click, alongside the existing custom color/image
- [ ] Per-link enable/disable toggle, and an optional publish date range
- [ ] Analytics with referrer, device, a 7/30-day trend, and top links

**Presentation — this is a portfolio piece**

- [ ] README with live link, screenshots, stack, and local setup
- [ ] `.env.example` documenting every required variable

### Out of Scope

- Custom domains — needs DNS plumbing and a paid Vercel tier; the `/username` URL is enough
- Payments / pro tier — no monetization intent; would add Stripe surface area for nothing
- Email/password auth — Google OAuth already works and adds no password-reset burden
- Migrating to TypeScript — the app is ~2000 lines of working JS; a rewrite buys no user value
- Team/multi-editor pages — one page has one owner, and nobody has asked for more

## Context

**Stack:** Next.js 15.2.8 App Router (JavaScript, not TypeScript), MongoDB via mongoose,
NextAuth v4 with the Google provider and MongoDBAdapter, AWS S3 (eu-north-1) for uploads,
Tailwind v4, react-sortablejs, react-toastify, react-google-charts, FontAwesome.

**Layout:** Route groups separate concerns — `(default)` for marketing/login, `(app)` for the
authed dashboard, `(page)` for the public profile. API routes: `/api/upload` (S3),
`/api/click` (click tracking), `/api/page` (fetch own page), `/api/auth/[...nextauth]`.

**Models:** `Page` (uri, owner, displayName, location, bio, bgType/bgColor/bgImage, buttons, links),
`User` (name, email, image), `Event` (type: click|view, page, url).

**Deployed:** https://linktree-princeji.vercel.app/ — the repo lives inside the `princeji100/projects`
monorepo at `projects/linktree`, so Vercel builds from a subdirectory root.

**Known issues entering this work:** Ten defects were confirmed by reading the codebase, listed
under Active above. The most serious is `/api/upload`, which accepts writes from anyone on the
internet with no session check, no size limit, and no MIME validation — a live S3 bill risk, not a
theoretical one.

**Recent cleanup (before this project was initialized):** the outer repo's `master` branch turned
out to be a CRLF-mangled copy of `main` plus an unrelated eshop monorepo; eshop was moved to its
own directory, a root `.gitignore` was added, a committed `.env` was untracked, and Next was
bumped 15.2.0 → 15.2.8 for the React Server Components CVE.

## Constraints

- **Tech stack**: Stay on Next.js App Router + mongoose + NextAuth v4 — the app works; migrations are not the goal
- **Language**: Stay in JavaScript — TypeScript conversion is explicitly out of scope
- **Hosting**: Vercel free tier — no long-running processes, no background workers, serverless timeouts apply
- **Storage**: AWS S3 on a personal account — abuse costs real money, which is why upload limits are a requirement and not a nice-to-have
- **Deployment**: Builds from a subdirectory of a shared monorepo — changes must not assume repo root
- **Audience**: Recruiters and clients will open the live link, so a broken flow costs more than a missing feature

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep signup open to everyone rather than locking to one email | User wants it to work as a real multi-tenant product, not a personal page | — Pending |
| Security work comes before features | Open signup + unauthenticated upload endpoint is an active liability | — Pending |
| Keep the single-repo structure (`projects/linktree` inside the monorepo) | Splitting would break the Vercel deployment for zero user benefit | — Pending |
| Stay on JavaScript | ~2000 lines of working code; a TS rewrite delivers nothing to users | — Pending |
| Serve both portfolio and personal use | User selected both; polish and reliability are both required, neither can be dropped | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-08 after initialization*
