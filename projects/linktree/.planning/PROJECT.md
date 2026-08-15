# Linktree

## What This Is

A multi-tenant link-in-bio app — an invited user signs in with Google, claims a username, and gets a
public profile page at `/username` with their links, social buttons, avatar, and background. Owners
get a dashboard to edit the page, customize design themes, schedule links, download print QR codes,
manage uploaded assets, and inspect 7d/30d view and click analytics. Signup is gated by an email
allowlist; the pages themselves are public to anyone.

It serves two purposes at once: a portfolio piece that recruiters and freelance clients will open
and judge, and an app Prince actually uses in place of the real Linktree.

## Core Value

A stranger opens `/username` and sees a page that loads fast, looks good, and whose links work —
every time, without the owner having to check on it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — verified in Milestone v1.0, live at https://linktree-princeji.vercel.app/ -->

**Security & Governance (v1.0):**
- ✓ Email allowlist gating on Google OAuth (`AllowedUser`) — v1.0
- ✓ One-time data wipe for clean slate (`scripts/wipe.js`) — v1.0
- ✓ Authenticated session enforcement on `/api/upload` — v1.0
- ✓ Server-side 5MB upload size cap and magic-byte inspection — v1.0
- ✓ 25MB per-user upload quota enforcement (`Upload` model) — v1.0
- ✓ Rate limiting on write endpoints (upload, page save, username claim) — v1.0
- ✓ Reserved usernames blocked (`account`, `login`, `api`, `about`, admin handles) — v1.0
- ✓ Username format validated (3–30 alphanumeric) — v1.0
- ✓ Safe click tracking payload handling without 500 crashes — v1.0
- ✓ Admin Control Center (`/dashboard/admin`) with session revocation — v1.0
- ✓ Creator uploads manager (`/dashboard/uploads`) with S3 asset cleanup — v1.0

**Platform Correctness & UX (v1.0):**
- ✓ `SavePageLinks` reports database persistence status accurately — v1.0
- ✓ Username claim form preserves input and displays inline error on rejection — v1.0
- ✓ Unknown `/username` returns a modern 404 instead of a 500 — v1.0
- ✓ No phantom view `Event` written for non-existent profiles — v1.0
- ✓ Safe fallback rendering for missing/broken avatar and background images — v1.0
- ✓ `params` awaited per Next.js 15 async dynamic route API — v1.0
- ✓ Analytics link rows use stable DB keys instead of random UUIDs — v1.0
- ✓ Social button brand icons rendered with static CSS and neutral fallback — v1.0
- ✓ Unified MongoDB connection pool via `lib/connectToDB.js` — v1.0

**Creator Features & Analytics (v1.0):**
- ✓ Active/Inactive link switch toggling without deletion — v1.0
- ✓ Inactive links hidden on public profile, preserved in dashboard — v1.0
- ✓ Optional UTC publish start and expiration datetime scheduling — v1.0
- ✓ Deterministic schedule evaluation against captured render timestamp — v1.0
- ✓ 8 curated accessible theme presets in page settings — v1.0
- ✓ 1-click theme presets with live phone header preview — v1.0
- ✓ Custom 2-color gradients, solid colors, and background image coexistence — v1.0
- ✓ Client-side scannable QR code card with quiet-zone padding — v1.0
- ✓ 1024x1024 high-resolution print PNG export — v1.0
- ✓ Server-side device platform and canonical referrer parsing — v1.0
- ✓ Analytics dashboard with 7-day and 30-day timeline views — v1.0
- ✓ Zero-dependency pure SVG area chart — v1.0
- ✓ Ranked link CTR table and clean empty states — v1.0

**Presentation & Verification (v1.0):**
- ✓ README with architecture, live demo link, screenshots, and local setup — v1.0
- ✓ 5 authentic desktop UI screenshots in `docs/screenshots/` — v1.0
- ✓ `.env.example` documenting all 8 environment variables safely — v1.0
- ✓ Multi-phase automated verification release gate (58/58 passing) — v1.0

### Active (v2.0 Milestone Candidates)

- [ ] Video & Music embeds (YouTube, Spotify, SoundCloud, Apple Music widgets)
- [ ] Custom typography selection engine (Curated Google Fonts with live preview)
- [ ] Creator monetization & Tip Jar support (UPI / payment badges)
- [ ] Printable analytics PDF reports & CSV export
- [ ] Geographic breakdown of profile views

### Out of Scope

- Custom domains — needs DNS plumbing and a paid Vercel tier; the `/username` URL is enough
- Payments / pro tier — no platform subscription monetization intent; Stripe surface area avoided
- Email/password auth — Google OAuth works seamlessly and adds no password-reset burden
- Migrating to TypeScript — ~2000 lines of working JS; a rewrite delivers zero incremental user value
- Team/multi-editor pages — one page has one owner, keeping the data model simple

## Context

**Stack:** Next.js 15.2.8 App Router (JavaScript), MongoDB via mongoose 8.12.1, NextAuth v4 with Google provider and MongoDBAdapter, AWS S3 (eu-north-1) for uploads, Tailwind CSS v4, react-sortablejs, react-toastify, FontAwesome.

**Layout:** Route groups separate concerns — `(default)` for marketing/login, `(app)` for the authed dashboard (`/account`, `/account/analytics`, `/dashboard/admin`, `/dashboard/uploads`), `(page)` for the public profile (`/[uri]`).

**Models:** `Page` (uri, owner, displayName, location, bio, bgType/bgColor/bgImage/theme, buttons, links), `User` (name, email, image), `Event` (type: click|view, page, url, device, referrer), `AllowedUser` (email), `Upload` (userEmail, key, size, mimeType), `RateLimit` (key, count, expiresAt).

**Deployed:** https://linktree-princeji.vercel.app/ — builds from the `projects/linktree` subdirectory inside the monorepo.

**Quality & Testing:** 58 automated unit, database, and integration assertions across 6 test suites (`scripts/verify-phase*.js`), passing cleanly alongside Next.js production build (`npm run build`).

## Constraints

- **Tech stack**: Stay on Next.js App Router + mongoose + NextAuth v4 — stable and reliable
- **Language**: Stay in JavaScript — TypeScript conversion is explicitly out of scope
- **Hosting**: Vercel free tier — serverless runtime constraints apply
- **Storage**: AWS S3 on a personal account — strictly guarded by 5MB file cap and 25MB user quota
- **Deployment**: Subdirectory build in a shared monorepo — paths must remain robust

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Invite-only allowlist (`AllowedUser`) | Free tiers require bounding total users while keeping public profile pages open to anyone. | ✓ Good (Implemented in Phase 1 & 1.5; admin UI live) |
| One-time data wipe (`scripts/wipe.js`) | Removed legacy unvalidated records for a clean slate across MongoDB and S3. | ✓ Good (Executed at start of Phase 1) |
| Unified MongoDB pooling (`lib/connectToDB.js`) | Single cached connection prevents socket exhaustion on serverless function invocations. | ✓ Good (Implemented in Phase 2) |
| Deterministic render timestamp for link lifecycle | Evaluates active, scheduled, and expired links consistently without race conditions. | ✓ Good (Implemented in Phase 3) |
| Zero-dependency pure SVG charts | Avoided large external charting dependencies; reduced bundle size and eliminated rendering glitches. | ✓ Good (Implemented in Phase 5) |
| Non-destructive theme switching | Preserves user custom colors/images when previewing and toggling presets. | ✓ Good (Implemented in Phase 4) |

---
*Last updated: 2026-08-15 after v1.0 milestone completion*
