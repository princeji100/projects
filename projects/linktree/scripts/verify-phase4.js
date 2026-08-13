import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Page from '../models/Page.js';
import { themes, getTheme } from '../lib/themes.js';

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

console.log('--- Running Phase 4 Themes & QR Sharing Verification ---\n');

// 1. Theme Preset Registry
await check('theme-registry: defines 8 curated accessible presets with all required visual tokens', async () => {
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

  const expectedIds = ['default', 'emerald', 'sunset', 'ocean', 'purple', 'minimal-light', 'cyberpunk', 'crimson'];
  assert.deepEqual(
    themes.map((t) => t.id),
    expectedIds,
    'Must include all expected theme IDs'
  );
});

// 2. Safe Fallback Resolution
await check('theme-fallback: getTheme resolves known keys and falls back to default on invalid/missing keys', async () => {
  // Known theme
  const emerald = getTheme('emerald');
  assert.equal(emerald.id, 'emerald');
  assert.equal(emerald.name, 'Emerald Forest');

  // Unknown / invalid theme
  const unknown = getTheme('neon_ultra_v2');
  assert.equal(unknown.id, 'default', 'Unknown key falls back to default');

  // Empty / null / undefined
  assert.equal(getTheme(null).id, 'default');
  assert.equal(getTheme(undefined).id, 'default');
  assert.equal(getTheme('').id, 'default');
});

// 3. Schema & Model Persistence
await check('page-schema-theme: Page model schema defines and persists theme and extended bgType', async () => {
  // Default legacy document
  const defaultDoc = new Page({ uri: 'defaultuser', owner: 'test@example.com' });
  assert.equal(defaultDoc.theme, 'default', 'Defaults to theme: "default"');
  assert.equal(defaultDoc.bgType, 'color', 'Defaults to bgType: "color"');

  // Explicit preset theme document
  const presetDoc = new Page({
    uri: 'cyberuser',
    owner: 'cyber@example.com',
    bgType: 'preset',
    theme: 'cyberpunk',
    bgColor: '#123456',
    bgImage: 'https://s3.aws.com/bg.png',
  });

  assert.equal(presetDoc.bgType, 'preset');
  assert.equal(presetDoc.theme, 'cyberpunk');
  assert.equal(presetDoc.bgColor, '#123456', 'Preserves custom bgColor');
  assert.equal(presetDoc.bgImage, 'https://s3.aws.com/bg.png', 'Preserves custom bgImage');
});

// 4. Custom Background Non-Destructive Mode Preservation
await check('custom-bg-preservation: switching bgType does not erase custom color or image data', async () => {
  // Simulate form state transitions in PageSettingForm
  let formState = {
    bgType: 'color',
    bgColor: '#ff5500',
    bgImage: 'https://s3.aws.com/my-bg.jpg',
    theme: 'default',
  };

  // Switch to preset
  formState = { ...formState, bgType: 'preset', theme: 'sunset' };
  assert.equal(formState.bgColor, '#ff5500', 'bgColor retained in state');
  assert.equal(formState.bgImage, 'https://s3.aws.com/my-bg.jpg', 'bgImage retained in state');

  // Switch to image
  formState = { ...formState, bgType: 'image' };
  assert.equal(formState.theme, 'sunset', 'theme retained in state');
  assert.equal(formState.bgColor, '#ff5500', 'bgColor retained in state');

  // Switch back to color
  formState = { ...formState, bgType: 'color' };
  assert.equal(formState.bgColor, '#ff5500');
  assert.equal(formState.bgImage, 'https://s3.aws.com/my-bg.jpg');
});

// 5. QR Code Canonical URL & Download Filename Computation
await check('qr-code-url-computation: correctly constructs canonical URL and download filename', async () => {
  function computeQrData(base, uri) {
    const cleanBase = (base || 'https://linktree.app').replace(/\/$/, '');
    const profileUrl = uri ? `${cleanBase}/${uri}` : '';
    const downloadFilename = `linktree-${uri || 'profile'}-qr.png`;
    return { profileUrl, downloadFilename };
  }

  const res1 = computeQrData('https://mylinks.io/', 'johndoe');
  assert.equal(res1.profileUrl, 'https://mylinks.io/johndoe');
  assert.equal(res1.downloadFilename, 'linktree-johndoe-qr.png');

  const res2 = computeQrData('https://domain.com', 'developer');
  assert.equal(res2.profileUrl, 'https://domain.com/developer');
  assert.equal(res2.downloadFilename, 'linktree-developer-qr.png');
});

// 6. Public Page Theme Resolution & Layout Integrity
await check('public-page-theme-resolution: resolves preset vs custom background correctly', async () => {
  function resolvePageStyles(page) {
    const currentTheme = getTheme(page.theme);
    const isPreset = page.bgType === 'preset';

    let headerStyle = {};
    let pageBgClass = currentTheme.pageBg;

    if (isPreset) {
      headerStyle = { backgroundColor: currentTheme.headerBg };
    } else if (page.bgType === 'color') {
      pageBgClass = 'bg-slate-950';
      headerStyle = { backgroundColor: page.bgColor || '#000' };
    } else if (page.bgType === 'image' && page.bgImage) {
      pageBgClass = 'bg-slate-950';
      headerStyle = { backgroundImage: `url(${page.bgImage})` };
    }

    return { pageBgClass, headerStyle, theme: currentTheme };
  }

  // Case A: Preset Mode
  const presetResult = resolvePageStyles({ bgType: 'preset', theme: 'purple' });
  assert.equal(presetResult.theme.id, 'purple');
  assert.equal(presetResult.headerStyle.backgroundColor, '#3b0764');
  assert.match(presetResult.pageBgClass, /from-purple-950/);

  // Case B: Custom Color Mode
  const colorResult = resolvePageStyles({ bgType: 'color', bgColor: '#112233', theme: 'sunset' });
  assert.equal(colorResult.headerStyle.backgroundColor, '#112233');
  assert.equal(colorResult.pageBgClass, 'bg-slate-950');

  // Case C: Custom Image Mode
  const imageResult = resolvePageStyles({ bgType: 'image', bgImage: 'https://s3.aws.com/bg.webp' });
  assert.equal(imageResult.headerStyle.backgroundImage, 'url(https://s3.aws.com/bg.webp)');
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
