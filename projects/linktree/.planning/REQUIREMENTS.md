# Requirements: Linktree v2.0

**Milestone:** v2.0 — Advanced Creator Suite & Zero-Cost Monetization
**Defined:** 2026-08-15
**Core Value:** A stranger opens `/[uri]` and sees a page that loads instantly, looks stunning, and works reliably — every time, on any device.

---

## v2.0 Requirements

### Phase 7: Google Fonts Typography Engine
- [ ] **FONT-01**: Curate a collection of 8 popular Google Fonts (Inter, Outfit, Poppins, Space Grotesk, Playfair Display, DM Sans, Plus Jakarta Sans, JetBrains Mono) loaded via `next/font/google`.
- [ ] **FONT-02**: Page settings form includes a font selector with visual font preview.
- [ ] **FONT-03**: Selected font dynamically applies to the public profile page (`/[uri]`) and dashboard live phone preview.

### Phase 8: Link Badges & Visual Accents
- [ ] **BADGE-01**: Creators can assign an optional badge (`🔥 HOT`, `✨ NEW`, `⭐ PINNED`, `🎁 OFFER`, `📌 SPOTLIGHT`) to any link.
- [ ] **BADGE-02**: Link cards on public page render distinct high-contrast badge pills with subtle animation.

### Phase 9: Interactive Media Embeds (0-Cost)
- [ ] **EMBED-01**: Parser detects YouTube, Spotify, and SoundCloud URLs and extracts embed IDs without external paid APIs.
- [ ] **EMBED-02**: Creators can toggle inline interactive player vs direct URL click for media links.
- [ ] **EMBED-03**: Public link cards render responsive inline iframe players with clean fallback.

### Phase 10: Creator Monetization & Tip Jar (0-Cost)
- [ ] **TIP-01**: Page model supports creator tip settings (`upiId`, `buyMeACoffee`, `paypal`).
- [ ] **TIP-02**: Tip Jar button on profile header opens an interactive tip modal with instant UPI deep-link (`upi://pay?pa=...`) and QR code.
- [ ] **TIP-03**: Dashboard settings provide a dedicated "Monetization & Tip Jar" configuration box.

### Phase 11: Analytics Export Suite (0-Cost Client-Side)
- [ ] **EXPORT-01**: Analytics dashboard includes a 1-click "Export CSV" button that generates a formatted spreadsheet of views and clicks.
- [ ] **EXPORT-02**: Print-friendly CSS allows 1-click PDF report generation directly from the browser.
