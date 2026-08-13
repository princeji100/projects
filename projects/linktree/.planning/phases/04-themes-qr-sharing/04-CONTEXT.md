# Phase 4: Themes & QR Sharing — Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 introduces curated theme presets for profile styling and a client-side QR code for profile sharing.

**In scope:**
- **THEME-01**: A centralized theme preset registry with 6–8 curated presets.
- **THEME-02**: Live inline preview in the dashboard settings form before saving.
- **THEME-03**: Custom color and custom background image remain fully functional alongside presets.
- **QR-01**: Dashboard displays a QR code encoding the owner's canonical public page URL.
- **QR-02**: QR code downloadable as PNG with proper filename and scanning contrast.

**Out of scope:**
- User-created or user-editable custom themes (v2).
- Seasonal or trending theme packs.
- Server-side QR generation or external QR APIs.
- Analytics enhancements (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### 1. Theme Storage Model
- **D-01:** Store only a stable theme preset key on the Page document: `page.theme` (String, default: `'default'`).
- **D-02:** Resolve the complete preset styling from a centralized, application-owned theme registry (`lib/themes.js`) at render time. No duplicated full style objects in Page documents.
- **D-03:** Unknown or removed theme keys fail safely to the `'default'` preset.
- **D-04:** Do not introduce a separate Theme collection unless future requirements add runtime-created or user-editable themes.

### 2. Preset vs Custom Precedence (bgType Extension)
- **D-05:** Extend `bgType` to a single explicit mode selector: `'color' | 'image' | 'preset'`.
- **D-06:** When `bgType === 'preset'`, resolve all styling exclusively from `page.theme` via the centralized preset registry.
- **D-07:** When `bgType === 'color'` or `'image'`, preserve the existing `bgColor`/`bgImage` behavior unchanged.
- **D-08:** Selecting a preset must NOT destructively overwrite existing custom color or image values — switching back to `'color'` or `'image'` restores the user's prior custom configuration.
- **D-09:** Legacy pages without a `theme` field render with the `'default'` preset styling when in preset mode, or their existing `bgColor`/`bgImage` as today.

### 3. Theme Preset Count & Scope (6–8 Curated Presets)
- **D-10:** Each preset defines only visual design tokens:
  - Page background (solid, gradient, or pattern)
  - Header/accent gradient treatment
  - Card background and border styling
  - Primary and muted text colors
  - Accent color
  - Link/button hover state styling
- **D-11:** Layout, spacing, component structure, avatar sizing, and content hierarchy remain unchanged across all themes.
- **D-12:** Every preset must meet accessible contrast requirements.
- **D-13:** A neutral `'default'` preset acts as the fallback for unknown theme keys.

### 4. Live Inline Preview in Dashboard
- **D-14:** Clicking a preset thumbnail in `PageSettingForm` immediately updates the header preview area using unsaved local form state — no database write until the owner explicitly saves.
- **D-15:** Cancel/reset restores the last persisted theme and background mode.
- **D-16:** Reuse the same centralized theme registry used by the public page so dashboard preview and production rendering cannot drift apart.

### 5. QR Code Generation (Client-Side)
- **D-17:** Generate QR codes entirely client-side using a lightweight maintained library (e.g. `qrcode` or `qrcode.react`).
- **D-18:** Encode only the canonical saved public profile URL using the application's base URL config (`NEXT_PUBLIC_URL`).
- **D-19:** Render a scannable QR preview in the dashboard with a clear PNG download action and appropriate filename (e.g. `linktree-{uri}-qr.png`).
- **D-20:** If no profile/username is saved yet, disable the download or show an explanatory empty state.

### 6. QR Code Dashboard Placement
- **D-21:** Add a dedicated QR Code section card on the existing `/account` dashboard, positioned below `PageSettingForm` and above `PageButtonForm`.
- **D-22:** Keep QR generation isolated from the page settings form — no shared form state or submission coupling.
- **D-23:** Provide a secondary copy-URL action alongside the PNG download.

</decisions>

<canonical_refs>
## Canonical References

- `.planning/REQUIREMENTS.md` § Phase 4 (THEME-01..THEME-03, QR-01, QR-02)
- `lib/themes.js` — Centralized theme preset registry (new)
- `models/Page.js` — Page model schema (add `theme` field)
- `components/forms/PageSettingForm.js` — Theme picker UI + live preview
- `app/(page)/[uri]/page.js` — Public profile theme rendering
- `components/sections/QRCodeCard.js` — QR code dashboard card (new)

</canonical_refs>

<code_context>
## Existing Code Insights

- `Page.bgType` is `'color' | 'image'` today — extending to `'preset'` is backward compatible.
- `PageSettingForm.js` already has a live preview area (the header div at the top) and a `RadioTogglers` component for switching `bgType`.
- The public page at `app/(page)/[uri]/page.js` resolves `headerStyle` from `bgType`/`bgColor`/`bgImage` — the preset path adds a third branch.
- `RadioTogglers.js` uses `Math.random()` for keys (FIX from Phase 2 scope left it alone) — needs stable keys when adding a third option.
- Dashboard at `app/(app)/account/page.js` renders `PageSettingForm`, `PageButtonForm`, `PageLinkForm` in sequence.
- `NEXT_PUBLIC_URL` is already used for click tracking pings.
- No QR dependency exists yet — will need `npm install qrcode.react`.

</code_context>

<deferred>
## Deferred Ideas
- User-created custom themes with arbitrary color pickers beyond the preset palette.
- Theme marketplace or community-shared themes.
- QR code customization (logo embedding, color styling, different error correction levels).

</deferred>
