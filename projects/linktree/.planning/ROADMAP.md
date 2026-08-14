# Roadmap: Linktree v2.0

## Overview

Milestone v2.0 extends the verified v1.0 foundation with zero-cost creator capabilities: Google Fonts typography customization, visual link badges, native interactive media embeds (YouTube/Spotify/SoundCloud), direct UPI/creator tip jar monetization, and client-side analytics export.

---

## Phases

- [ ] **Phase 7: Google Fonts Typography Engine** - 8 curated Google Fonts with live dashboard preview and public dynamic application.
- [ ] **Phase 8: Link Badges & Visual Accents** - Custom badge selector (`HOT`, `NEW`, `PINNED`, `OFFER`) with animated pill rendering.
- [ ] **Phase 9: Interactive Media Embeds (0-Cost)** - Zero-cost inline playable widgets for YouTube, Spotify, and SoundCloud.
- [ ] **Phase 10: Creator Monetization & Tip Jar (0-Cost)** - Direct UPI deep-link & QR code modal + BuyMeACoffee/PayPal tip triggers.
- [ ] **Phase 11: Analytics Export Suite (0-Cost Client-Side)** - Browser-native CSV download and printable PDF summary.

---

## Phase Details

### Phase 7: Google Fonts Typography Engine
**Goal**: Allow creators to choose from 8 curated Google Fonts that transform their profile typography instantly.  
**Requirements**: FONT-01, FONT-02, FONT-03  
**Success Criteria**:
1. Creator can pick a font in Page Settings and see the live phone preview update immediately.
2. Saved font dynamically applies across the public profile page (`/[uri]`).
3. Defaults to `Inter` / standard system font gracefully if unselected.

---

### Phase 8: Link Badges & Visual Accents
**Goal**: Help creators highlight priority links with eye-catching badges.  
**Requirements**: BADGE-01, BADGE-02  
**Success Criteria**:
1. Link editor includes a badge picker (`HOT`, `NEW`, `PINNED`, `OFFER`, `NONE`).
2. Public page renders badges with high-contrast pills and micro-pulse animation.

---

### Phase 9: Interactive Media Embeds (0-Cost)
**Goal**: Play media (YouTube, Spotify, SoundCloud) directly inside Linktree without leaving the page.  
**Requirements**: EMBED-01, EMBED-02, EMBED-03  
**Success Criteria**:
1. Pasting a YouTube or Spotify URL automatically detects embed capability.
2. Clicking an embed-enabled link unfolds a responsive inline player.

---

### Phase 10: Creator Monetization & Tip Jar (0-Cost)
**Goal**: Empower creators to receive direct tips and support via UPI, Buy Me a Coffee, and PayPal with zero platform overhead.  
**Requirements**: TIP-01, TIP-02, TIP-03  
**Success Criteria**:
1. Creator enters UPI ID / support links in dashboard.
2. Public profile features a "Tip / Support" button that opens an instant UPI QR code & mobile deep-link (`upi://pay?pa=...`).

---

### Phase 11: Analytics Export Suite (0-Cost Client-Side)
**Goal**: Export visitor and click statistics for brand sponsorship decks.  
**Requirements**: EXPORT-01, EXPORT-02  
**Success Criteria**:
1. 1-click "Download CSV" generates a client-side `.csv` file of all link clicks and view events.
2. Print CSS allows clean PDF generation via the browser print dialog.

---
*Run `/gsd-plan-phase 7` to plan Phase 7 execution.*
