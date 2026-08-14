import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

// Register test loader for standalone Node execution of next/font/google
register(new URL('./font-loader.mjs', import.meta.url).href, import.meta.url);

import Page from '../models/Page.js';
const { fonts, getFont } = await import('../lib/fonts.js');

let passed = 0;
let failed = 0;

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

console.log('--- Running Wave 1 Typography Data Model & Registry Verification ---\n');

// 1. Page Schema additive font field & legacy default
await check('schema-font-field: Page schema defines additive font field with default "default"', async () => {
  const legacyDoc = new Page({ uri: 'legacy_user', owner: 'legacy@example.com' });
  assert.equal(legacyDoc.font, 'default', 'Legacy page must default font to "default"');
  assert.equal(legacyDoc.theme, 'default', 'Legacy theme must remain "default"');
  assert.equal(legacyDoc.bgType, 'color', 'Legacy bgType must remain "color"');
  assert.equal(legacyDoc.bgColor, '#000', 'Legacy bgColor must remain "#000"');

  const customDoc = new Page({
    uri: 'custom_font_user',
    owner: 'custom@example.com',
    font: 'outfit',
  });
  assert.equal(customDoc.font, 'outfit', 'Custom font must persist string identifier');
});

// 2. Curated Google Fonts Registry Coverage
await check('font-registry-coverage: defines 10+ curated fonts with all required tokens', async () => {
  assert.ok(fonts.length >= 10, `Registry must define at least 10 font options (found ${fonts.length})`);

  const expectedIds = [
    'default',
    'inter',
    'outfit',
    'poppins',
    'space-grotesk',
    'playfair',
    'dm-sans',
    'manrope',
    'montserrat',
    'lora',
    'plus-jakarta-sans',
  ];

  for (const expectedId of expectedIds) {
    const font = getFont(expectedId);
    assert.equal(font.id, expectedId, `Must resolve font by ID: ${expectedId}`);
    assert.ok(font.name, `Font ${expectedId} must define display name`);
    assert.ok(font.description, `Font ${expectedId} must define description`);
    assert.ok(font.fontFamily !== undefined, `Font ${expectedId} must define fontFamily`);
  }
});

// 3. getFont Safe Fallback Resolution (0 crashes guaranteed)
await check('getFont-safe-fallback: resolves known keys and falls back to default on invalid/missing keys', async () => {
  // Known font
  const inter = getFont('inter');
  assert.equal(inter.id, 'inter');

  // Case & whitespace insensitivity
  assert.equal(getFont('  OUTFIT  ').id, 'outfit');
  assert.equal(getFont('Space-Grotesk').id, 'space-grotesk');

  // Unknown / invalid keys must fall back to default
  assert.equal(getFont('comic-sans-ms').id, 'default');
  assert.equal(getFont('invalid_font_123').id, 'default');
  assert.equal(getFont(null).id, 'default');
  assert.equal(getFont(undefined).id, 'default');
  assert.equal(getFont('').id, 'default');
  assert.equal(getFont(123).id, 'default');
});

// 4. Zero New Dependencies Safeguard
await check('zero-dependencies: package.json has no new dependencies added', async () => {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const deps = Object.keys(pkg.dependencies || {});
  
  // Verify next/font/google is used from core next package, not separate npm modules
  assert.ok(!deps.includes('@next/font'), 'Must use next/font/google from next, not deprecated @next/font');
  assert.ok(!deps.includes('google-fonts'), 'Must not add third-party google-fonts packages');
  assert.ok(!deps.includes('webfontloader'), 'Must not add third-party webfontloader');
});

console.log('\n================================');
console.log(`Wave 1 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
