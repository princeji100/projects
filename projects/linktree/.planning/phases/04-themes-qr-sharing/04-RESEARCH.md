# Phase 4 Technical Research: Themes & QR Sharing

## 1. Theme Architecture & Preset Registry

### Theme Storage Model
- `Page` model adds `theme: { type: String, default: 'default' }`.
- `Page.bgType` is `'color' | 'image' | 'preset'`.
- All visual design tokens are defined in `lib/themes.js`.
- Lookup helper `getTheme(key)` returns the preset object or falls back safely to `'default'`.

### Visual Design Tokens per Preset
Each theme preset contains:
- `id`: unique string key (e.g. `'default'`, `'emerald'`, `'sunset'`, `'ocean'`, `'purple'`, `'minimal-light'`, `'cyberpunk'`, `'crimson'`).
- `name`: Human-readable label.
- `previewColor` / `previewGradient`: CSS swatch for preset selector in dashboard.
- `pageBg`: Tailwind class for page background.
- `headerBg`: Tailwind class / background style for top header area.
- `headerOverlay`: Tailwind gradient overlay class.
- `cardBg`: Tailwind class for link card background.
- `cardBorder`: Tailwind class for link card border.
- `textColor`: Primary text color.
- `mutedTextColor`: Subtext/location color.
- `subtitleColor`: Link subtitle color.
- `iconBg`: Link icon circular container background.
- `buttonStyle`: Social icon button styling.

---

## 2. Live Inline Preview State Machine in `PageSettingForm`
- Local state: `const [bgType, setBgType] = useState(page?.bgType || 'color')`
- `const [theme, setTheme] = useState(page?.theme || 'default')`
- When `bgType === 'preset'`, header preview renders selected theme's header styling and preview badge.
- When `bgType === 'color'`, header preview renders `bgColor`.
- When `bgType === 'image'`, header preview renders `bgImage`.
- Form submit passes `bgType`, `theme`, `bgColor`, `bgImage`, and `avatar` to `SavePageSetting`.

---

## 3. Client-Side QR Code Card (`components/sections/QRCodeCard.js`)
- Uses `qrcode.react` (`QRCodeSVG` or `QRCodeCanvas`).
- Computes public URL: `${process.env.NEXT_PUBLIC_URL || window.location.origin}/${page.uri}`.
- Renders:
  - Scannable QR preview with adequate quiet zone padding.
  - "Download PNG" action that converts canvas to a downloadable PNG file named `linktree-${page.uri}-qr.png`.
  - "Copy Link" action with toast confirmation.
  - Disabled / empty state if `page.uri` is not set.

---

## 4. Public Profile Page Theme Rendering (`app/(page)/[uri]/page.js`)
- Server component extracts `themeKey = page.theme || 'default'`.
- Resolves `currentTheme = getTheme(themeKey)`.
- If `page.bgType === 'preset'`:
  - Applies `currentTheme.pageBg`, `currentTheme.cardBg`, `currentTheme.textColor`, etc.
- If `page.bgType === 'color'` or `'image'`:
  - Applies custom background style while using default theme's card typography/styles.
