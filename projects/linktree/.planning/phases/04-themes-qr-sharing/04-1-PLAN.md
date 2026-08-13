---
phase: 04-themes-qr-sharing
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/themes.js
  - models/Page.js
  - action/PageAction.js
  - components/formItem/RadioTogglers.js
  - components/forms/PageSettingForm.js
  - components/sections/QRCodeCard.js
  - app/(app)/account/page.js
  - app/(page)/[uri]/page.js
autonomous: true
requirements:
  - THEME-01
  - THEME-02
  - THEME-03
  - QR-01
  - QR-02
must_haves:
  truths:
    - "lib/themes.js defines 8 curated accessible presets with a safe fallback to 'default'."
    - "Page model schema persists theme and extended bgType ('color' | 'image' | 'preset')."
    - "PageSettingForm previews preset themes live inline before saving."
    - "Custom color and image configurations are preserved when switching to/from preset mode."
    - "QRCodeCard renders a scannable QR code and provides a PNG download."
    - "Public profile page renders the saved theme preset seamlessly."
  artifacts:
    - path: "lib/themes.js"
      provides: "Theme preset registry and getTheme helper"
    - path: "components/sections/QRCodeCard.js"
      provides: "QR Code preview and PNG download component"
---

<objective>
Implement theme presets, live inline dashboard preview, custom background preservation, and client-side QR code generation & PNG downloading.
</objective>

<execution_context>
@~/.gemini/antigravity/get-shit-done/workflows/execute-plan.md
@~/.gemini/antigravity/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04-themes-qr-sharing/04-CONTEXT.md
@.planning/phases/04-themes-qr-sharing/04-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Theme Preset Registry & Lookup Helper (THEME-01, THEME-03)</name>
  <files>lib/themes.js</files>
  <read_first>.planning/phases/04-themes-qr-sharing/04-CONTEXT.md</read_first>
  <action>
    Create `lib/themes.js` exporting:
    1. `themes`: Array of 8 curated presets:
       - `default` (Midnight Slate)
       - `emerald` (Emerald Forest)
       - `sunset` (Sunset Glow)
       - `ocean` (Deep Ocean)
       - `purple` (Royal Amethyst)
       - `minimal-light` (Clean Ivory)
       - `cyberpunk` (Neon Cyber)
       - `crimson` (Crimson Noir)
    2. `getTheme(key)`: Returns preset object for `key`, falling back to `default` if key is undefined, null, or unrecognized.
  </action>
  <verify>
    <automated>test -f lib/themes.js</automated>
  </verify>
  <done>
    `lib/themes.js` provides centralized design tokens for all 8 presets with safe fallback.
  </done>
</task>

<task type="auto">
  <name>Task 2: Schema & Action Persistence for Theme & bgType (THEME-01, THEME-03)</name>
  <files>models/Page.js, action/PageAction.js</files>
  <read_first>models/Page.js, action/PageAction.js</read_first>
  <action>
    1. In `models/Page.js`:
       - Add `theme: { type: String, default: 'default' }` to `PageSchema`.
    2. In `action/PageAction.js`:
       - Update `SavePageSetting(formData)` to extract and sanitize `theme` (defaulting to `'default'`) and `bgType` (`'color' | 'image' | 'preset'`).
       - Ensure `Page.updateOne` persists `theme` alongside existing `bgType`, `bgColor`, `bgImage`, `displayName`, `location`, `bio`.
  </action>
  <verify>
    <automated>grep -q 'theme' models/Page.js && grep -q 'theme' action/PageAction.js</automated>
  </verify>
  <done>
    `Page` schema and `SavePageSetting` action persist theme and extended `bgType`.
  </done>
</task>

<task type="auto">
  <name>Task 3: Dashboard Theme Picker & Live Inline Preview (THEME-01, THEME-02, THEME-03)</name>
  <files>components/formItem/RadioTogglers.js, components/forms/PageSettingForm.js</files>
  <read_first>components/formItem/RadioTogglers.js, components/forms/PageSettingForm.js, lib/themes.js</read_first>
  <action>
    1. In `components/formItem/RadioTogglers.js`:
       - Use stable key `option.value` instead of `Math.random()`.
    2. In `components/forms/PageSettingForm.js`:
       - Add `'preset'` option to `RadioTogglers` with icon `faMagic` / `faBrush`.
       - Add local `theme` state initialized with `page.theme || 'default'`.
       - When `bgType === 'preset'`, display visual theme preset swatch grid allowing one-click selection.
       - Update the header preview element to dynamically reflect the selected theme's header styling, gradient, and preview swatch in real-time before saving.
       - Ensure switching between preset, color, and image preserves the underlying `bgColor`, `bgImage`, and `theme` values in form state.
  </action>
  <verify>
    <automated>grep -q 'themes' components/forms/PageSettingForm.js</automated>
  </verify>
  <done>
    `PageSettingForm` enables one-click preset selection with real-time live preview before saving.
  </done>
</task>

<task type="auto">
  <name>Task 4: Client-Side QR Code Card Component (QR-01, QR-02)</name>
  <files>components/sections/QRCodeCard.js, app/(app)/account/page.js</files>
  <read_first>app/(app)/account/page.js</read_first>
  <action>
    1. Create `components/sections/QRCodeCard.js`:
       - `'use client'` component using `QRCodeCanvas` / `QRCodeSVG` from `qrcode.react`.
       - Computes the canonical public profile URL based on `page.uri`.
       - Renders high-contrast QR code with quiet zone.
       - Implements "Download PNG" function downloading `linktree-${page.uri}-qr.png` with 1024x1024 canvas export.
       - Implements "Copy Link" button with toast feedback.
       - Handles missing/empty URI gracefully with a disabled empty state.
    2. In `app/(app)/account/page.js`:
       - Import and render `<QRCodeCard page={pageData} />` between `PageSettingForm` and `PageButtonForm`.
  </action>
  <verify>
    <automated>test -f components/sections/QRCodeCard.js && grep -q 'QRCodeCard' app/\(app\)/account/page.js</automated>
  </verify>
  <done>
    Dedicated QR Code card renders scannable QR and high-res PNG download in the dashboard.
  </done>
</task>

<task type="auto">
  <name>Task 5: Public Page Theme Rendering (THEME-01, THEME-02, THEME-03)</name>
  <files>app/(page)/[uri]/page.js</files>
  <read_first>app/(page)/[uri]/page.js, lib/themes.js</read_first>
  <action>
    In `app/(page)/[uri]/page.js`:
    - Import `getTheme` from `@/lib/themes`.
    - Retrieve `theme = getTheme(page.theme)`.
    - If `page.bgType === 'preset'`:
      - Apply `theme.pageBg`, `theme.headerBg`, `theme.headerOverlay`, `theme.cardBg`, `theme.cardBorder`, `theme.textColor`, `theme.mutedTextColor`, `theme.subtitleColor`, `theme.iconBg`, and `theme.buttonStyle`.
    - If `page.bgType === 'color'` or `'image'`:
      - Apply custom background styling with default theme card typography.
  </action>
  <verify>
    <automated>grep -q 'getTheme' app/\(page\)/\[uri\]/page.js</automated>
  </verify>
  <done>
    Public page renders chosen theme presets and custom backgrounds with zero layout flash.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries
| Boundary | Description |
|----------|-------------|
| Theme Input | User submitted theme key from form |
| QR URL Generation | Public page URL encoded into canvas |

## STRIDE Threat Register
| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-4-01 | Tampering | action/PageAction.js | mitigate | Sanitize theme key against known preset IDs; fallback to 'default' |
| T-4-02 | Information Disclosure | components/sections/QRCodeCard.js | mitigate | Encode only public URI URL; disable download when username is unsaved |
</threat_model>

<verification>
Run `node --env-file=.env scripts/verify-phase4.js` and `npm run build`.
</verification>

<success_criteria>
Theme presets, live preview, custom background preservation, and QR code generation & PNG download pass all verification checks and build cleanly.
</success_criteria>

<output>
Create `.planning/phases/04-themes-qr-sharing/04-1-SUMMARY.md` when done
</output>
