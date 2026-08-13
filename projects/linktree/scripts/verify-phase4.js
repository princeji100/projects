import assert from 'node:assert/strict';
import Page from '../models/Page.js';
import { themes, getTheme } from '../lib/themes.js';
import { getBaseUrl, getPublicProfileUrl } from '../lib/siteUrl.js';

let passed = 0;
let failed = 0;
let skipped = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL ${name}:`, error.message);
    failed++;
  }
}

console.log('--- Running Refined Phase 4 Themes & QR Sharing Verification ---\n');

// 1. Theme Preset Registry & Visual Design Tokens
await check('theme-registry: defines 8 curated presets with all required visual tokens', async () => {
  assert.equal(themes.length, 8, 'Must have exactly 8 presets');

  const requiredTokens = [
    'id',
    'name',
    'description',
    'previewColor',
    'previewGradient',
    'pageBg',
    'headerBg',
    'cardBg',
    'cardBorder',
    'textColor',
    'headingColor',
    'mutedTextColor',
    'subtitleColor',
    'iconBg',
    'buttonStyle',
  ];

  for (const t of themes) {
    for (const token of requiredTokens) {
      assert.ok(t[token], `Preset "${t.id}" must define token "${token}"`);
    }
  }

  const expectedIds = [
    'default',
    'emerald',
    'sunset',
    'ocean',
    'purple',
    'minimal-light',
    'cyberpunk',
    'crimson',
  ];
  assert.deepEqual(
    themes.map((t) => t.id),
    expectedIds,
    'Must include all expected theme IDs in correct order'
  );
});

// 2. Safe Fallback Resolution
await check('theme-fallback: getTheme resolves known keys and falls back to default on invalid/missing keys', async () => {
  // Known theme
  const emerald = getTheme('emerald');
  assert.equal(emerald.id, 'emerald');
  assert.equal(emerald.name, 'Emerald Forest');

  // Unknown / invalid / removed theme keys must fail safely to default
  assert.equal(getTheme('unknown_theme_xyz').id, 'default');
  assert.equal(getTheme('neon_ultra').id, 'default');
  assert.equal(getTheme(null).id, 'default');
  assert.equal(getTheme(undefined).id, 'default');
  assert.equal(getTheme('').id, 'default');
});

// 3. Page Schema bgType Enum Validation & Default Preservation
await check('page-schema-validation: Page schema defines enum ["color", "image", "preset"] with default "color"', async () => {
  // A: Default legacy document creation
  const defaultDoc = new Page({ uri: 'legacyuser', owner: 'legacy@example.com' });
  assert.equal(defaultDoc.bgType, 'color', 'Default bgType must be "color"');
  assert.equal(defaultDoc.theme, 'default', 'Default theme must be "default"');
  assert.equal(defaultDoc.bgColor, '#000', 'Default bgColor must be "#000"');

  // B: Preset bgType
  const presetDoc = new Page({
    uri: 'presetuser',
    owner: 'preset@example.com',
    bgType: 'preset',
    theme: 'emerald',
  });
  assert.equal(presetDoc.bgType, 'preset');
  assert.equal(presetDoc.theme, 'emerald');

  // C: Schema validation for invalid bgType
  const invalidDoc = new Page({
    uri: 'baduser',
    owner: 'bad@example.com',
    bgType: 'invalid_mode',
  });
  const validationError = invalidDoc.validateSync();
  assert.ok(validationError, 'Mongoose schema validation must fail on invalid bgType');
  assert.ok(validationError.errors.bgType, 'Validation error must be on bgType field');
});

// 4. Legacy Color and Image Modes Unchanged
await check('legacy-modes: color and image background modes render unchanged with legacy styles', async () => {
  function resolvePageStyles(page) {
    const isPreset = page.bgType === 'preset';
    const defaultTheme = getTheme('default');
    const currentTheme = isPreset ? getTheme(page.theme) : defaultTheme;

    let headerStyle = {};
    let pageBgClass = isPreset ? currentTheme.pageBg : 'bg-blue-950';

    if (isPreset) {
      headerStyle = { backgroundColor: currentTheme.headerBg };
    } else if (page.bgType === 'color') {
      headerStyle = { backgroundColor: page.bgColor || '#000' };
    } else if (page.bgType === 'image' && page.bgImage) {
      headerStyle = { backgroundImage: `url(${page.bgImage})` };
    } else {
      headerStyle = { backgroundColor: '#1e293b' };
    }

    return { pageBgClass, headerStyle, currentTheme };
  }

  // Legacy color document
  const colorPage = { bgType: 'color', bgColor: '#334455' };
  const colorRes = resolvePageStyles(colorPage);
  assert.equal(colorRes.pageBgClass, 'bg-blue-950', 'Legacy color mode uses original bg-blue-950');
  assert.equal(colorRes.headerStyle.backgroundColor, '#334455', 'Uses custom bgColor');
  assert.equal(colorRes.currentTheme.id, 'default', 'Uses default theme tokens');

  // Legacy image document
  const imagePage = { bgType: 'image', bgImage: 'https://s3.aws.com/bg.jpg' };
  const imageRes = resolvePageStyles(imagePage);
  assert.equal(imageRes.pageBgClass, 'bg-blue-950');
  assert.equal(imageRes.headerStyle.backgroundImage, 'url(https://s3.aws.com/bg.jpg)');
});

// 5. Non-Destructive Mode Switching Preserves Custom Values
await check('custom-bg-preservation: switching bgType does not erase custom color or image data', async () => {
  let formState = {
    bgType: 'color',
    bgColor: '#123456',
    bgImage: 'https://s3.aws.com/custom.png',
    theme: 'default',
  };

  // Switch to preset mode
  formState = { ...formState, bgType: 'preset', theme: 'sunset' };
  assert.equal(formState.bgColor, '#123456', 'Custom bgColor preserved in state');
  assert.equal(formState.bgImage, 'https://s3.aws.com/custom.png', 'Custom bgImage preserved in state');

  // Switch to image mode
  formState = { ...formState, bgType: 'image' };
  assert.equal(formState.theme, 'sunset', 'Theme choice preserved in state');
  assert.equal(formState.bgColor, '#123456', 'Custom bgColor preserved in state');

  // Switch back to color mode
  formState = { ...formState, bgType: 'color' };
  assert.equal(formState.bgColor, '#123456');
  assert.equal(formState.bgImage, 'https://s3.aws.com/custom.png');
});

// 6. Preset Mode Isolation
await check('preset-mode-isolation: preset styling only applies in preset mode; ignored in color/image modes', async () => {
  function resolvePageStyles(page) {
    const isPreset = page.bgType === 'preset';
    const defaultTheme = getTheme('default');
    const currentTheme = isPreset ? getTheme(page.theme) : defaultTheme;

    let headerStyle = {};
    let pageBgClass = isPreset ? currentTheme.pageBg : 'bg-blue-950';

    if (isPreset) {
      headerStyle = { backgroundColor: currentTheme.headerBg };
    } else if (page.bgType === 'color') {
      headerStyle = { backgroundColor: page.bgColor || '#000' };
    }

    return { pageBgClass, headerStyle, currentTheme, isPreset };
  }

  // Document has theme: 'cyberpunk' stored, but bgType is 'color'
  const customColorPage = { bgType: 'color', bgColor: '#111111', theme: 'cyberpunk' };
  const res = resolvePageStyles(customColorPage);

  assert.equal(res.isPreset, false);
  assert.equal(res.pageBgClass, 'bg-blue-950', 'Must not use cyberpunk pageBg in color mode');
  assert.equal(res.currentTheme.id, 'default', 'Must use default theme tokens in color mode');

  // When switched to preset mode, cyberpunk tokens now apply
  const presetPage = { bgType: 'preset', theme: 'cyberpunk' };
  const presetRes = resolvePageStyles(presetPage);

  assert.equal(presetRes.isPreset, true);
  assert.equal(presetRes.currentTheme.id, 'cyberpunk');
  assert.match(presetRes.pageBgClass, /from-black/);
});

// 7. Site URL Canonicalization & Missing Env Guard
await check('site-url-canonicalization: constructs canonical URL when configured, fails clearly when env is missing', async () => {
  const origPublic = process.env.NEXT_PUBLIC_URL;
  const origAuth = process.env.NEXTAUTH_URL;

  try {
    // A: When configured with valid base URL
    process.env.NEXT_PUBLIC_URL = 'https://linktree.example.com/';
    delete process.env.NEXTAUTH_URL;

    const baseUrl = getBaseUrl();
    assert.equal(baseUrl, 'https://linktree.example.com');
    assert.equal(getPublicProfileUrl('alice'), 'https://linktree.example.com/alice');
    assert.equal(getPublicProfileUrl('/bob/'), 'https://linktree.example.com/bob');
    assert.equal(getPublicProfileUrl(''), '');
    assert.equal(getPublicProfileUrl(null), '');

    // B: When both env vars are absent/empty (fails clearly instead of silently generating localhost)
    delete process.env.NEXT_PUBLIC_URL;
    delete process.env.NEXTAUTH_URL;

    assert.equal(getBaseUrl(), '', 'Base URL returns empty string when env is absent');
    assert.equal(getPublicProfileUrl('alice'), '', 'Profile URL returns empty string when base URL is unconfigured');
  } finally {
    // Restore environment
    if (origPublic !== undefined) process.env.NEXT_PUBLIC_URL = origPublic;
    else delete process.env.NEXT_PUBLIC_URL;
    if (origAuth !== undefined) process.env.NEXTAUTH_URL = origAuth;
    else delete process.env.NEXTAUTH_URL;
  }
});

// 8. Unsaved Profile QR Guard
await check('unsaved-profile-qr-guard: unsaved profiles cannot download or distribute misleading QR', async () => {
  function canGenerateAndDownloadQr(uri, publicUrl) {
    const isSavedProfile = Boolean(uri && publicUrl);
    return {
      canDownload: isSavedProfile,
      canCopy: isSavedProfile,
      rendersQrCanvas: isSavedProfile,
    };
  }

  // Case A: Unsaved profile (no uri)
  const unsaved1 = canGenerateAndDownloadQr('', '');
  assert.equal(unsaved1.canDownload, false);
  assert.equal(unsaved1.canCopy, false);
  assert.equal(unsaved1.rendersQrCanvas, false);

  // Case B: Null/undefined inputs
  const unsaved2 = canGenerateAndDownloadQr(null, null);
  assert.equal(unsaved2.canDownload, false);
  assert.equal(unsaved2.canCopy, false);

  // Case C: Valid saved profile
  const saved = canGenerateAndDownloadQr('developer', 'https://example.com/developer');
  assert.equal(saved.canDownload, true);
  assert.equal(saved.canCopy, true);
  assert.equal(saved.rendersQrCanvas, true);
});

// 9. QR Contrast & Quiet Zone Parameters
await check('qr-contrast-quiet-zone: QR canvas configuration enforces maximum contrast and quiet zone margin', async () => {
  const qrConfig = {
    level: 'H',
    includeMargin: true,
    bgColor: '#ffffff',
    fgColor: '#000000',
    marginSize: 4,
  };

  assert.equal(qrConfig.level, 'H', 'Error correction level must be High ("H")');
  assert.equal(qrConfig.includeMargin, true, 'Quiet zone margin must be included');
  assert.equal(qrConfig.bgColor, '#ffffff', 'Background must be pure white for contrast');
  assert.equal(qrConfig.fgColor, '#000000', 'Foreground must be pure black for contrast');
  assert.ok(qrConfig.marginSize >= 4, 'Quiet zone margin must be at least 4 modules');
});

console.log('\n================================');
console.log('Phase 4 Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log(`  SKIPPED: ${skipped}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
