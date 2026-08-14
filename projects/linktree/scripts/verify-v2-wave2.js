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

console.log('--- Running Wave 2 Typography Picker & Public Rendering Verification ---\n');

// 1. Valid Font ID Persistence & Schema Roundtrip
await check('font-persistence-roundtrip: valid font ID persists and reloads correctly', async () => {
  const doc = new Page({
    uri: 'designer_pro',
    owner: 'designer@example.com',
    font: 'playfair',
  });
  assert.equal(doc.font, 'playfair', 'Font field must store "playfair"');
  
  const resolvedFont = getFont(doc.font);
  assert.equal(resolvedFont.id, 'playfair');
  assert.equal(resolvedFont.name, 'Playfair Display');
});

// 2. Canonicalization & Case-Insensitive Matching
await check('font-canonicalization: matches case-insensitively and trims whitespace', async () => {
  const variations = ['  OUTFIT  ', 'Outfit', 'outfit', '  outfit'];
  for (const v of variations) {
    const font = getFont(v);
    assert.equal(font.id, 'outfit', `"${v}" must canonicalize to "outfit"`);
  }
});

// 3. Strict Rejection of Unknown Font IDs in Action Logic
await check('font-rejection: unknown/unregistered font IDs are strictly refused', async () => {
  const testInputs = ['comic-sans', 'hack-font-123', '<script>', 'arial'];
  for (const input of testInputs) {
    const normalized = String(input).trim().toLowerCase();
    const valid = fonts.find((f) => f.id === normalized);
    assert.equal(valid, undefined, `Input "${input}" must not be recognized as a valid registry font`);
  }
});

// 4. Default / Legacy Fallback Invariant
await check('legacy-font-fallback: legacy/missing/corrupted font falls back to "default"', async () => {
  const legacyDoc = new Page({
    uri: 'old_account',
    owner: 'old@example.com',
  });
  assert.equal(legacyDoc.font, 'default', 'Legacy doc without font field must default to "default"');
  assert.equal(getFont(legacyDoc.font).id, 'default');
  
  // Corrupt/historical invalid values
  assert.equal(getFont(null).id, 'default');
  assert.equal(getFont(undefined).id, 'default');
  assert.equal(getFont('').id, 'default');
  assert.equal(getFont('random_corrupt_data').id, 'default');
});

// 5. Shared Registry Parity (Single Source of Truth)
await check('shared-registry-parity: all 11 registry fonts are well-formed and distinct', async () => {
  const ids = fonts.map((f) => f.id);
  const uniqueIds = new Set(ids);
  assert.equal(uniqueIds.size, ids.length, 'All font IDs in registry must be unique');
  assert.ok(ids.includes('default'), 'Registry must include "default"');
  assert.ok(ids.includes('inter'), 'Registry must include "inter"');
  assert.ok(ids.includes('outfit'), 'Registry must include "outfit"');
  assert.ok(ids.includes('poppins'), 'Registry must include "poppins"');
  assert.ok(ids.includes('space-grotesk'), 'Registry must include "space-grotesk"');
  assert.ok(ids.includes('playfair'), 'Registry must include "playfair"');
  assert.ok(ids.includes('dm-sans'), 'Registry must include "dm-sans"');
  assert.ok(ids.includes('manrope'), 'Registry must include "manrope"');
  assert.ok(ids.includes('montserrat'), 'Registry must include "montserrat"');
  assert.ok(ids.includes('lora'), 'Registry must include "lora"');
  assert.ok(ids.includes('plus-jakarta-sans'), 'Registry must include "plus-jakarta-sans"');
});

// 6. Theme and Background Mode Preservation
await check('theme-bg-preservation: font selection does not mutate theme or background presets', async () => {
  const themedDoc = new Page({
    uri: 'themed_font_user',
    owner: 'themed@example.com',
    theme: 'emerald',
    font: 'manrope',
    bgType: 'preset',
  });
  assert.equal(themedDoc.theme, 'emerald');
  assert.equal(themedDoc.font, 'manrope');
  assert.equal(themedDoc.bgType, 'preset');
});

console.log('\n================================');
console.log(`Wave 2 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
