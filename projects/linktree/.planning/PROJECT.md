# Linktree

## What This Is

A high-performance, multi-tenant link-in-bio platform — invited creators sign in with Google, claim a unique handle, and get a public profile page at `/[uri]` with their links, social channels, interactive media embeds, avatar, and themes. Owners get an intuitive dashboard to manage pages, view real-time SVG click/view analytics, generate 1024px print QR codes, and monetize their audience.

## Core Value

A stranger opens `/[uri]` and sees a page that loads instantly, looks stunning, and works reliably — every time, on any device.

---

## Milestone Status

### Shipped: Milestone v1.0 (2026-08-15)
- ✓ **Security & Multi-Tenant Gates**: Invite allowlist, S3 quota & MIME validation, rate limits, reserved usernames.
- ✓ **Correctness**: 404 guards, zero-error async params, safe image fallbacks, unified DB pool.
- ✓ **Link Lifecycle**: Active toggling, UTC publish windows.
- ✓ **Themes & QR**: 8 presets, 2-color gradient engine, 1024px print-ready QR exporter.
- ✓ **Real-Time Analytics**: Zero-dependency SVG area chart, 7d/30d filters, device/referrer metrics, CTR rankings.
- ✓ **Governance**: Centralized admin panel, user handle associations, feedback/bug report pipeline.

---

### Active: Milestone v2.0 — Advanced Creator Suite & Zero-Cost Monetization

#### Phase 7: Google Fonts Typography Engine
- [ ] Curate 8-10 high-performance Google Fonts (Inter, Outfit, Poppins, Space Grotesk, Playfair Display, DM Sans, Plus Jakarta Sans, JetBrains Mono).
- [ ] Font selector in Page settings with instant live preview.
- [ ] Dynamic font variable application on public profile.

#### Phase 8: Link Badges & Visual Accents
- [ ] Add badge selector (`🔥 HOT`, `✨ NEW`, `⭐ PINNED`, `🎁 OFFER`, `📌 SPOTLIGHT`) to Link management.
- [ ] Render animated and high-contrast badge pills on public link cards.

#### Phase 9: Interactive Media Embeds (0-Cost)
- [ ] URL parser for YouTube, Spotify, and SoundCloud embeds.
- [ ] Inline responsive player accordion on public link cards.
- [ ] Toggle embed mode vs direct redirect in link editor.

#### Phase 10: Creator Monetization & Tip Jar (0-Cost)
- [ ] UPI handle & QR generator modal for Indian creators (`upi://pay?pa=...`).
- [ ] Support for Buy Me a Coffee and PayPal tip button integrations.
- [ ] Direct tip badge on profile header.

#### Phase 11: Analytics Export Suite (0-Cost Client-Side)
- [ ] 1-click CSV download of click and view events.
- [ ] Print-ready PDF report generator directly in browser.

---

## Architecture & Stack
- **Framework**: Next.js 15.2.8 (App Router, JavaScript)
- **Database**: MongoDB Atlas via Mongoose
- **Auth**: NextAuth.js v4 (Google OAuth with Allowlist validation)
- **Cloud Media**: AWS S3 with magic-byte validation and 25MB per-user quota
- **Styling**: Tailwind CSS v4 + Vanilla CSS + FontAwesome Icons
- **Deployment**: Live on Vercel (`linktree-princeji.vercel.app`)
