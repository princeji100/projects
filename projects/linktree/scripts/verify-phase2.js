import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { allButtons, getSocialButton } from '../lib/socialButtons.js';

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

console.log('--- Running Phase 2 Unit & Code Verification ---\n');

// 1. FIX-01: SavePageLinks returns true on success
await check('fix-01-page-links-success-return: SavePageLinks returns { success: true }', async () => {
  const content = fs.readFileSync(path.resolve('action/PageAction.js'), 'utf8');
  assert.match(content, /await Page\.updateOne\(.+links\s*\}/, 'Must update links in Page collection');
  assert.match(content, /return\s*\{\s*success:\s*true\s*\}/, 'SavePageLinks must return { success: true }');
});

// 2. FIX-02: UserNameForm error handling & input preservation
await check('fix-02-username-form-rejection: UserNameForm checks result?.success and preserves input', async () => {
  const content = fs.readFileSync(path.resolve('components/forms/UserNameForm.js'), 'utf8');
  assert.match(content, /result\?\.success/, 'Must check result?.success before redirecting');
  assert.match(content, /setErrorMessage\(result\?\.error/, 'Must set error message on failure');
  assert.doesNotMatch(content, /event\.target\.reset\(\)/, 'Must NOT reset input on submit attempt');
});

// 3. FIX-03, FIX-04, FIX-06: Public profile route async params, 404 guard, and gated event logging
await check('fix-03-04-06-public-profile-guard: async params, notFound 404, and gated event creation', async () => {
  const content = fs.readFileSync(path.resolve('app/(page)/[uri]/page.js'), 'utf8');
  assert.match(content, /const\s*\{\s*uri\s*\}\s*=\s*await\s+params/, 'Must await params in Next.js 15 (FIX-06)');
  assert.match(content, /if\s*\(\s*!page\s*\)\s*\{\s*notFound\(\);?\s*\}/, 'Must call notFound() when page is null (FIX-03)');
  
  // Verify Event.create is strictly AFTER notFound() check
  const notFoundIdx = content.indexOf('notFound()');
  const eventCreateIdx = content.indexOf('Event.create(');
  assert.ok(notFoundIdx > 0, 'notFound() must be present');
  assert.ok(eventCreateIdx > notFoundIdx, 'Event.create must execute strictly AFTER notFound() guard (FIX-04)');

  assert.ok(fs.existsSync(path.resolve('app/(page)/[uri]/not-found.js')), 'Custom not-found.js must exist');
});

// 4. FIX-05: Missing & Runtime Image Fallback Handling
await check('fix-05-image-fallbacks: ProfileAvatar and LinkIcon degrade gracefully', async () => {
  assert.ok(fs.existsSync(path.resolve('components/media/ProfileAvatar.js')), 'ProfileAvatar component exists');
  assert.ok(fs.existsSync(path.resolve('components/media/LinkIcon.js')), 'LinkIcon component exists');
  
  const avatarContent = fs.readFileSync(path.resolve('components/media/ProfileAvatar.js'), 'utf8');
  assert.match(avatarContent, /onError=\{/, 'ProfileAvatar must have onError handler for runtime load failures');
  assert.match(avatarContent, /!src\s*\|\|\s*hasError/, 'ProfileAvatar must handle empty src and error states');

  const linkIconContent = fs.readFileSync(path.resolve('components/media/LinkIcon.js'), 'utf8');
  assert.match(linkIconContent, /onError=\{/, 'LinkIcon must have onError handler for runtime load failures');
  assert.match(linkIconContent, /!src\s*\|\|\s*hasError/, 'LinkIcon must handle empty src and error states');
});

// 5. FIX-07: Analytics Stable React Keys
await check('fix-07-analytics-stable-keys: Link analytics map uses persistent database-backed link key', async () => {
  const content = fs.readFileSync(path.resolve('app/(app)/account/analytics/page.js'), 'utf8');
  assert.doesNotMatch(content, /uuidv4\(\)/, 'Analytics page must NOT generate fresh uuidv4 on render');
  assert.match(content, /link\._id\?\.toString\(\)\s*\|\|\s*link\.id\s*\|\|\s*`\$\{link\.url\}-\$\{index\}`/, 'Must prefer persistent _id, id, then stable fallback');
});

// 6. FIX-08: Centralized Social Buttons with Static Brand Colors
await check('fix-08-social-button-brand-colors: all 16 platforms defined with static colors and neutral fallback', async () => {
  assert.equal(allButtons.length, 16, 'Must define all 16 platform buttons');
  
  for (const btn of allButtons) {
    assert.ok(btn.key, 'Button has key');
    assert.ok(btn.icon, `Button ${btn.key} has FontAwesome icon`);
    assert.match(btn.color, /^#[0-9a-fA-F]{6}$/, `Button ${btn.key} has valid hex brand color`);
  }

  // Test neutral fallback for unknown platform
  const unknownBtn = getSocialButton('custom_platform');
  assert.equal(unknownBtn.key, 'custom_platform');
  assert.equal(unknownBtn.color, '#64748b', 'Unknown button must have neutral fallback color');

  const formContent = fs.readFileSync(path.resolve('components/forms/PageButtonForm.js'), 'utf8');
  assert.doesNotMatch(formContent, /text-\$\{b\.key\}-500/, 'Must not use dynamic purged Tailwind classes');
});

// 7. FIX-09: Single MongoDB Connection Path
await check('fix-09-mongo-connection-unification: grabusername uses shared connectToDatabase helper', async () => {
  const content = fs.readFileSync(path.resolve('action/grabusername.js'), 'utf8');
  assert.match(content, /import\s+connectToDatabase\s+from\s+['"]@\/lib\/connectToDB['"]/, 'Must import connectToDatabase');
  assert.match(content, /await\s+connectToDatabase\(\)/, 'Must call connectToDatabase()');
  assert.doesNotMatch(content, /mongoose\.connect\(/, 'Must NOT make private mongoose.connect calls');
});

console.log('\n================================');
console.log('Phase 2 Verification Results:');
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log(`  SKIPPED: ${skipped}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
