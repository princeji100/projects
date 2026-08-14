# Linktree — Modern Bio Link & Analytics Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3%20Storage-FF9900?style=flat&logo=amazon-s3)](https://aws.amazon.com/s3/)
[![Live Demo](https://img.shields.io/badge/Demo-Live%20Deployment-success?style=flat)](https://linktree-princeji.vercel.app/)

A full-stack, production-grade Linktree platform built with **Next.js 15 App Router**, **React 19**, **MongoDB**, **Tailwind CSS 4**, and **AWS S3**. Enables creators to publish scheduled bio links, apply curated visual themes and typography, highlight key links with badges, receive reader support via a UPI Tip Jar, embed rich interactive media (YouTube, Spotify, Apple Music, SoundCloud), distribute print-ready QR codes, and export actionable traffic reports via CSV or browser-native Print/PDF.

> **Zero Paid-API Architecture**: All v2 creator features (typography, badges, UPI payment intents, media embeds, and report exports) are implemented cleanly with zero paid provider API keys, zero third-party SDK bloat, and zero schema migrations.

---

## 🌟 Key Features

### 👤 Profile Customization & Visual Themes
- **Curated Theme Presets**: Choose from 8 visual themes (Emerald, Sunset, Ocean, Cyberpunk, Crimson, Minimal Light, etc.) or customize colors and background images with real-time live preview.
- **Curated Typography**: Select from 10 distinct Google Fonts (Inter, Outfit, Poppins, Space Grotesk, Playfair Display, DM Sans, Manrope, Montserrat, Lora, Plus Jakarta Sans) with instant phone-preview synchronization and graceful default fallback.
- **Custom Bio & Socials**: Configure display name, bio, location, avatar, and social handle icons.

### ⏱️ Link Lifecycle & Scheduling
- **UTC Scheduling Windows**: Schedule links with optional start and end datetime windows in UTC.
- **Real-Time Lifecycle Evaluation**: Dynamic status indicators (`Live`, `Scheduled`, `Expired`) update automatically with master active/inactive toggle overrides.
- **Server-Authoritative Filtering**: Non-live links are filtered out server-side on public routes before rendering.

### 🏷️ Link Badges
- **Visual Highlight Pills**: Highlight important links with curated status badges:
  - 🔥 **Hot** — trending or high-engagement links
  - ✨ **New** — recently published content or updates
  - ⭐ **Pinned** — visual badge highlighting key links *(visual only; does not reorder links)*
  - 🎁 **Offer** — promotions, discounts, or special deals

### ☕ UPI Tip Jar (Creator Monetization)
- **Zero-Fee Peer-to-Peer Tips**: Creators configure their Virtual Payment Address (VPA / UPI ID) with optional payee name, suggested amount (INR), and custom payment note.
- **Accessible Public Modal**: Visitors can trigger an accessible Tip Jar modal directly from the public profile.
- **Multi-Device Support**: Launches installed UPI apps via standard `upi://pay` deep-links on mobile, renders dynamic QR codes for desktop scanning, and provides a one-click UPI ID copy fallback.
- *Privacy & Safety*: Direct peer-to-peer payment intent only; the application does not process, verify, or store financial transactions.

### 🎵 Rich Media Embeds (Lazy-Loaded)
- **Deterministic URL Parsing**: Automatically detects media links from standard URLs without schema changes or database migrations.
- **Interactive Embed Players**:
  - 🎬 **YouTube**: Standard videos, `youtu.be` links, and Shorts rendered in responsive 16:9 players.
  - 🎧 **Spotify**: Tracks, albums, playlists, artists, podcast shows, and episodes in compact iframe players.
  - 🍎 **Apple Music**: Albums, playlists, and individual songs.
  - ☁️ **SoundCloud**: Individual tracks and full sets/playlists.
- **Performance & Privacy**: Embed iframes are never loaded on initial page render; players mount lazily only upon explicit visitor interaction. Includes external fallback links to open directly on the provider.

### 📊 Actionable Analytics & Reporting
- **7-Day & 30-Day Windows**: Server-aggregated metrics computed over precise half-open UTC date boundaries.
- **Continuous Trend Charts**: Daily click timeline with zero-fill handling for inactive days.
- **Device & Referrer Attribution**: Server-side user-agent classification (Mobile, Desktop, Tablet) and referrer domain normalization (Direct, Internal, External).
- **Deterministic Link Rankings**: Click leaderboard preserving historical attribution for renamed or removed links.
- **Client-Side CSV Export**: Download spreadsheet-ready CSV reports matching the active dashboard date range with automated formula-injection defense.
- **Print & Save as PDF**: Clean, A4-formatted printable report hiding dashboard chrome with dedicated summary header and daily click breakdown tables.

### 📱 Distribution & Security
- **Print-Ready QR Codes**: High-contrast, quiet-zone compliant QR codes with one-click 1024x1024 high-res PNG export.
- **AWS S3 Storage & Quota Management**: 25 MB per-user media upload quota with automated in-use reference detection to prevent orphaned asset accumulation.
- **Hardened Access Control**: Admin allowlist gating, session eviction upon revocation, distributed in-memory rate limiting, and fail-closed public URL canonicalization.

---

## 📸 Visual Showcase

### Public Profile & Theme Presets
![Public Profile](docs/screenshots/public-profile.png)

### Dashboard Settings & Live Preview
![Profile Settings](docs/screenshots/profile-settings.png)

### Link Lifecycle & UTC Scheduling
![Link Scheduling](docs/screenshots/link-scheduling.png)

### QR Code Generator & High-Res PNG Export
![QR Sharing](docs/screenshots/qr-card.png)

### Analytics Dashboard (7d / 30d Views)
![Analytics Dashboard](docs/screenshots/analytics-dashboard.png)

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 15.2 (App Router) | Server Components, Server Actions, Route Handlers |
| **Frontend** | React 19, Tailwind CSS 4 | Responsive UI, FontAwesome 6, Date-fns, `qrcode.react` |
| **Database** | MongoDB & Mongoose | Connection pooling, subdocument schemas, indexed URIs |
| **Object Storage** | AWS S3 (SDK v3) | User media uploads, avatar & background image assets |
| **Authentication** | NextAuth.js | OAuth sessions, allowlist middleware & session eviction |
| **Typography** | `next/font/google` | 10 pre-configured Google Fonts with zero runtime layout shift |

---

## 📁 Project Structure

```
projects/linktree/
├── action/                  # Server Actions (PageAction.js, UploadAction.js)
├── app/                     # Next.js 15 App Router
│   ├── (app)/               # Authenticated dashboard routes
│   │   ├── account/         # Account overview & profile customization
│   │   │   ├── admin/       # Admin allowlist management
│   │   │   ├── analytics/   # 7d / 30d analytics dashboard & export
│   │   │   └── uploads/     # S3 media manager & quota tracker
│   │   └── layout.js        # Authenticated dashboard shell & navigation
│   ├── (page)/[uri]/        # Public bio profile dynamic route
│   ├── api/                 # API Route Handlers (auth, click, page, upload)
│   ├── globals.css          # Tailwind CSS 4 & A4 print stylesheet
│   └── layout.js            # Root HTML layout & session providers
├── components/              # Reusable React UI Components
│   ├── analytics/           # AnalyticsClient, metrics KPI cards, charts, rankings
│   ├── formItem/            # Form controls (RadioTogglers, Input)
│   ├── forms/               # PageSettingForm, PageLinkForm, UserNameForm, PhonePreview
│   ├── layout/              # AppSidebar, MobileNavBar, SectionBox, PageTitle
│   ├── media/               # Media embeds (YouTube, Spotify, Apple Music, SoundCloud)
│   ├── tipjar/              # PublicTipJar modal & QR payment triggers
│   └── sections/            # QRCodeCard component
├── docs/screenshots/        # High-resolution UI showcase images
├── lib/                     # Core business logic & registries
│   ├── admin.js             # Admin authorization & allowlist helpers
│   ├── analyticsCsv.js      # Formula-safe CSV export generator
│   ├── analyticsData.js     # Server-authoritative analytics aggregation
│   ├── analyticsParser.js   # Device & referrer normalization engine
│   ├── connectToDB.js       # MongoDB singleton connection pool
│   ├── fonts.js             # Centralized Google Fonts registry & loader
│   ├── linkBadges.js        # Link badge metadata & validation registry
│   ├── linkLifecycle.js     # Deterministic UTC link lifecycle evaluator
│   ├── mediaEmbeds.js       # Media URL parser & allowlisted embed registry
│   ├── rateLimit.js         # Distributed in-memory sliding window limiter
│   ├── siteUrl.js           # Canonical public URL resolver
│   ├── themes.js            # Curated theme preset tokens registry
│   └── tipJar.js            # VPA validation & generic UPI intent builder
├── models/                  # Mongoose Schemas (Page, User, Event, Upload, AllowedUser)
├── scripts/                 # Automated behavioral verification test suites (Waves 1–14, Phase 6)
├── .env.example             # Complete environment configuration template
└── README.md                # Canonical documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.18+ or v20+
- **MongoDB**: Local instance or MongoDB Atlas cluster URI
- **AWS S3**: Bucket with IAM access credentials (`PutObject`, `DeleteObject`, `GetObject`)

### Local Setup (from Monorepo Root)

1. **Navigate to the project directory**:
   ```bash
   cd projects/linktree
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your settings:
   ```env
   # MongoDB Connection URI
   MONGODB_URI=mongodb://localhost:27017/linktree

   # AWS S3 Storage for File Uploads
   BUCKET_NAME=your-s3-bucket-name
   S3_ACCESS_KEY=your-aws-access-key-id
   S3_SECRET_KEY=your-aws-secret-access-key

   # Canonical Public & Auth Base URLs
   NEXT_PUBLIC_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-nextauth-secret

   # Admin Access Control (Allowlist Management)
   ADMIN_EMAIL=admin@example.com
   ```
   *(Note: No third-party API keys are required for YouTube, Spotify, Apple Music, SoundCloud, or payments.)*

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 🧪 Verification & Automated Test Suites

The codebase includes comprehensive automated verification suites covering all architectural layers:

```bash
# Run all Milestone v2 feature verification suites (Waves 1–14)
for i in {1..14}; do node "scripts/verify-v2-wave${i}.js"; done

# Run Milestone v1 regression & release-gate verification
node scripts/verify-phase6.js

# Validate Next.js production build
npm run build
```

| Verification Suite | Target Feature / Layer | Scope |
|---|---|---|
| `verify-v2-wave1.js` | Typography Schema & Registry | Font models, defaults, loader invariants |
| `verify-v2-wave2.js` | Typography UI & Live Preview | Settings picker, phone sync, public render |
| `verify-v2-wave3.js` | Link Badge Data Model | Badge enum, normalizer, server sanitization |
| `verify-v2-wave4.js` | Link Badge UI & Rendering | Form selectors, preview pills, public badges |
| `verify-v2-wave5.js` | Tip Jar Data Model & Validation | VPA regex, amount normalization, UPI URIs |
| `verify-v2-wave6.js` | Tip Jar Settings UI | Dashboard inputs, preview sync, atomic save |
| `verify-v2-wave7.js` | Public Tip Jar Modal & QR | Modal accessibility, QR generation, UPI intent |
| `verify-v2-wave8.js` | Media Embed Parser & Security | Strict host allowlisting, URL extraction |
| `verify-v2-wave9.js` | YouTube Embed UI | Lazy mounting, 16:9 aspect, click tracking |
| `verify-v2-wave10.js` | Spotify Embed UI | Tracks/albums/playlists, iframe permissions |
| `verify-v2-wave11.js` | Apple Music Embed UI | Embed URL construction, lazy player mount |
| `verify-v2-wave12.js` | SoundCloud Embed UI | Track/set widget embed, lazy activation |
| `verify-v2-wave13.js` | Analytics CSV Export | Formula injection neutralization, row counts |
| `verify-v2-wave14.js` | Print / Save as PDF Analytics | A4 styles, chrome hiding, print-only tables |
| `verify-phase6.js` | Full Regression & Build Gate | Traceability matrix, clean-clone, sub-suites |

---

## 🛡️ Security & Backward Compatibility Notes

- **Additive Schema Design**: All new fields (`font`, `badge`, `tipJar`) specify robust defaults (`default`, `none`, `{ enabled: false }`). Legacy documents render seamlessly without requiring database migrations.
- **Zero-Dependency Media Parsing**: Media embeds are derived dynamically from saved link URLs on demand. No media-type columns or video IDs are stored in the database.
- **Iframe Host Allowlisting**: Embed iframes are strictly constrained to approved HTTPS origins (`www.youtube-nocookie.com`, `open.spotify.com`, `embed.music.apple.com`, `w.soundcloud.com`). No arbitrary HTML or user scripts are rendered.
- **Formula Injection Defense**: All exported CSV cells starting with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are neutralized with prepended quotes.
- **Fail-Closed Access Control**: Unauthenticated requests to dashboard routes redirect to login; non-admin users cannot view or modify the admin allowlist.

---

## ⚠️ Known Limitations

- **Peer-to-Peer UPI Intents**: The UPI Tip Jar generates client-side payment intents (`upi://pay`) and QR codes. It does not verify transaction status, process funds, or maintain financial ledger histories.
- **Visitor-Initiated Media Mounting**: To conserve visitor bandwidth and optimize page load speeds, media players mount iframes only upon explicit user interaction.
- **Supported Media URLs**: Rich embeds support standard public tracks, videos, playlists, and sets from YouTube, Spotify, Apple Music, and SoundCloud. Non-media or unsupported formats render as standard high-performance links.
- **Visual-Only Pinned Badge**: The `Pinned` badge provides visual prominence on the link card; it does not alter manual link sort order.
- **Client-Side Report Exports**: Analytics CSV and PDF exports are generated directly within the browser using active dashboard data; server-side background PDF rendering and native `.xlsx` formats are not utilized.

---

## 📄 License & Attribution

Built with passion by [Prince Ji](https://github.com/princeji100) · [princeji.com](https://princeji.com) · [Live Demo](https://linktree-princeji.vercel.app/)
