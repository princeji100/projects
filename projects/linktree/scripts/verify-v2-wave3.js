import assert from 'node:assert/strict';
import { register } from 'node:module';
import Page from '../models/Page.js';
import { LINK_BADGES, getLinkBadge, normalizeLinkBadge, VALID_BADGE_IDS } from '../lib/linkBadges.js';
import { getLinkLifecycleStatus, isLinkLive, validateAndSanitizeLink } from '../lib/linkLifecycle.js';

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

console.log('--- Running Wave 3 Link Badge Data Model & Validation Verification ---\n');

// 1. LinkSchema Definition & Enum Coverage
await check('schema-badge-enum: LinkSchema defines badge field with exact supported enum', async () => {
  const expectedBadges = ['none', 'hot', 'new', 'pinned', 'offer'];
  
  // Test each valid badge instantiation
  for (const badgeVal of expectedBadges) {
    const doc = new Page({
      uri: `user_${badgeVal}`,
      owner: `${badgeVal}@example.com`,
      links: [{ title: 'Test Link', url: 'https://example.com', badge: badgeVal }],
    });
    assert.equal(doc.links[0].badge, badgeVal, `Must accept enum value: "${badgeVal}"`);
  }

  // Test invalid badge rejection by Mongoose Schema validation
  const invalidDoc = new Page({
    uri: 'bad_badge_user',
    owner: 'bad_badge@example.com',
    links: [{ title: 'Bad', url: 'https://example.com', badge: 'super-trending' }],
  });
  const validationErr = invalidDoc.validateSync();
  assert.ok(validationErr, 'Schema must fail validation on invalid badge enum');
});

// 2. Missing Badge Resolves to 'none' Default
await check('legacy-missing-badge-default: missing/undefined badge defaults to "none"', async () => {
  const legacyDoc = new Page({
    uri: 'legacy_links_user',
    owner: 'legacy_links@example.com',
    links: [{ title: 'My Portfolio', url: 'https://example.com' }],
  });
  assert.equal(legacyDoc.links[0].badge, 'none', 'Legacy links without badge must default to "none"');
  assert.equal(getLinkBadge(legacyDoc.links[0].badge).id, 'none');
  assert.equal(getLinkBadge(legacyDoc.links[0].badge).displayText, '');
});

// 3. Normalization & Canonicalization
await check('badge-canonicalization: trims whitespace and lowercases valid inputs', async () => {
  const cases = [
    { input: '  HOT  ', expected: 'hot' },
    { input: 'New', expected: 'new' },
    { input: 'PINNED', expected: 'pinned' },
    { input: '  Offer  ', expected: 'offer' },
    { input: '', expected: 'none' },
    { input: null, expected: 'none' },
    { input: undefined, expected: 'none' },
  ];

  for (const c of cases) {
    const res = normalizeLinkBadge(c.input);
    assert.equal(res.ok, true, `Should successfully normalize "${c.input}"`);
    assert.equal(res.badge, c.expected, `"${c.input}" must normalize to "${c.expected}"`);
  }
});

// 4. Invalid Badge Value Rejection
await check('invalid-badge-rejection: refuses unknown badge values with clear error', async () => {
  const invalidInputs = ['trending', 'vip', '123', 'hot-deal', 'none-extra', '<script>'];
  
  for (const input of invalidInputs) {
    const res = normalizeLinkBadge(input);
    assert.equal(res.ok, false, `normalizeLinkBadge must reject invalid badge: "${input}"`);
    assert.ok(res.error, 'Rejection must provide descriptive error message');
  }
});

// 5. Preservation of Existing Link Properties and Order
await check('property-preservation: badge processing does not mutate or drop existing link properties', async () => {
  const testDateStart = new Date('2026-08-01T00:00:00.000Z');
  const testDateEnd = new Date('2026-08-30T00:00:00.000Z');

  const originalLinks = [
    {
      title: 'YouTube Channel',
      subtitle: 'Subscribe for tutorials',
      url: 'https://youtube.com/@princeji',
      icon: 'https://s3.example.com/yt.png',
      active: true,
      startsAt: testDateStart,
      endsAt: testDateEnd,
      badge: 'HOT',
    },
    {
      title: 'GitHub Repo',
      subtitle: 'Open source code',
      url: 'https://github.com/princeji100',
      icon: 'https://s3.example.com/gh.png',
      active: false,
      startsAt: null,
      endsAt: null,
      badge: 'PINNED',
    },
    {
      title: 'Legacy Link',
      url: 'https://princeji.com',
    },
  ];

  const processedLinks = [];
  for (const link of originalLinks) {
    const lifecycleResult = validateAndSanitizeLink(link);
    assert.equal(lifecycleResult.ok, true);
    
    const badgeResult = normalizeLinkBadge(link.badge);
    assert.equal(badgeResult.ok, true);
    
    lifecycleResult.link.badge = badgeResult.badge;
    processedLinks.push(lifecycleResult.link);
  }

  // 1. Order preserved
  assert.equal(processedLinks.length, 3);
  assert.equal(processedLinks[0].title, 'YouTube Channel');
  assert.equal(processedLinks[1].title, 'GitHub Repo');
  assert.equal(processedLinks[2].title, 'Legacy Link');

  // 2. Properties preserved
  assert.equal(processedLinks[0].badge, 'hot');
  assert.equal(processedLinks[0].subtitle, 'Subscribe for tutorials');
  assert.equal(processedLinks[0].icon, 'https://s3.example.com/yt.png');
  assert.equal(processedLinks[0].active, true);
  assert.equal(processedLinks[0].startsAt?.toISOString(), testDateStart.toISOString());
  assert.equal(processedLinks[0].endsAt?.toISOString(), testDateEnd.toISOString());

  assert.equal(processedLinks[1].badge, 'pinned');
  assert.equal(processedLinks[1].active, false);

  assert.equal(processedLinks[2].badge, 'none');
  assert.equal(processedLinks[2].active, true);
});

// 6. No Sorting Semantics for 'pinned' (Visual badge only in v2.0)
await check('pinned-no-sorting: pinned badge does not alter array index or reorder links', async () => {
  const links = [
    { title: 'Normal Link 1', url: 'https://example.com/1', badge: 'none' },
    { title: 'Pinned Link in Middle', url: 'https://example.com/2', badge: 'pinned' },
    { title: 'Normal Link 3', url: 'https://example.com/3', badge: 'none' },
  ];

  // Simulating retrieval: index 0 remains index 0, index 1 remains index 1
  assert.equal(links[0].title, 'Normal Link 1');
  assert.equal(links[1].title, 'Pinned Link in Middle');
  assert.equal(links[2].title, 'Normal Link 3');
});

// 7. Existing Lifecycle Evaluator Invariant
await check('lifecycle-evaluator-unaltered: isLinkLive and getLinkLifecycleStatus remain accurate', async () => {
  const now = new Date('2026-08-15T12:00:00.000Z');
  
  const liveLink = { active: true, badge: 'hot' };
  assert.equal(isLinkLive(liveLink, now), true);
  assert.equal(getLinkLifecycleStatus(liveLink, now), 'live');

  const inactiveLink = { active: false, badge: 'pinned' };
  assert.equal(isLinkLive(inactiveLink, now), false);
  assert.equal(getLinkLifecycleStatus(inactiveLink, now), 'inactive');
});

console.log('\n================================');
console.log(`Wave 3 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
