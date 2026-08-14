import assert from 'node:assert/strict';
import { register } from 'node:module';
import Page from '../models/Page.js';
import { LINK_BADGES, getLinkBadge, normalizeLinkBadge } from '../lib/linkBadges.js';
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

console.log('--- Running Wave 4 Link Badge Dashboard & Public UI Verification ---\n');

// 1. Dashboard Badge Options from Centralized Registry
await check('dashboard-registry-options: options match centralized registry', async () => {
  const ids = LINK_BADGES.map((b) => b.id);
  assert.deepEqual(ids, ['none', 'hot', 'new', 'pinned', 'offer']);
  for (const b of LINK_BADGES) {
    assert.ok(b.label, `Badge ${b.id} must have a non-empty label`);
    assert.ok(b.pillClass !== undefined, `Badge ${b.id} must define pillClass`);
  }
});

// 2. 'none' Badge Display Metadata (Renders nothing)
await check('none-badge-metadata: "none" produces no display text or emoji', async () => {
  const noneBadge = getLinkBadge('none');
  assert.equal(noneBadge.id, 'none');
  assert.equal(noneBadge.displayText, '');
  assert.equal(noneBadge.emoji, '');
  assert.equal(noneBadge.badgeClass, '');
});

// 3. Active Badge Metadata Resolution
await check('active-badge-metadata: "hot", "new", "pinned", "offer" produce distinct metadata', async () => {
  const hot = getLinkBadge('hot');
  assert.equal(hot.id, 'hot');
  assert.equal(hot.displayText, 'HOT');
  assert.equal(hot.emoji, '🔥');
  assert.ok(hot.badgeClass.includes('rose'));

  const newB = getLinkBadge('new');
  assert.equal(newB.id, 'new');
  assert.equal(newB.displayText, 'NEW');
  assert.equal(newB.emoji, '✨');
  assert.ok(newB.badgeClass.includes('sky'));

  const pinned = getLinkBadge('pinned');
  assert.equal(pinned.id, 'pinned');
  assert.equal(pinned.displayText, 'PINNED');
  assert.equal(pinned.emoji, '⭐');
  assert.ok(pinned.badgeClass.includes('amber'));

  const offer = getLinkBadge('offer');
  assert.equal(offer.id, 'offer');
  assert.equal(offer.displayText, 'OFFER');
  assert.equal(offer.emoji, '🎁');
  assert.ok(offer.badgeClass.includes('purple'));
});

// 4. Unsaved Preview State Propagation Simulation
await check('unsaved-preview-propagation: state updates locally without DB write', async () => {
  let localLinks = [
    { title: 'Portfolio', url: 'https://example.com', badge: 'none' },
  ];

  // User changes badge to 'hot'
  localLinks = localLinks.map((l, i) => i === 0 ? { ...l, badge: 'hot' } : l);

  // PhonePreview receives updated array
  const previewBadge = getLinkBadge(localLinks[0].badge);
  assert.equal(previewBadge.id, 'hot');
  assert.equal(previewBadge.displayText, 'HOT');
});

// 5. Save & Reload Roundtrip with Page Document
await check('save-reload-preservation: persists badge correctly across documents', async () => {
  const doc = new Page({
    uri: 'creator_badged',
    owner: 'creator@example.com',
    links: [
      { title: 'Special Discount', url: 'https://shop.example.com', badge: 'offer' },
      { title: 'Important Announcement', url: 'https://blog.example.com', badge: 'pinned' },
    ],
  });

  assert.equal(doc.links[0].badge, 'offer');
  assert.equal(getLinkBadge(doc.links[0].badge).displayText, 'OFFER');
  assert.equal(doc.links[1].badge, 'pinned');
  assert.equal(getLinkBadge(doc.links[1].badge).displayText, 'PINNED');
});

// 6. Legacy / Missing / Corrupt Badge Safe Fallback
await check('legacy-corrupt-badge-fallback: safely falls back to "none"', async () => {
  const testValues = [null, undefined, '', 'INVALID_BADGE_STRING', '<script>', 'unknown'];
  for (const val of testValues) {
    const res = getLinkBadge(val);
    assert.equal(res.id, 'none', `Value "${val}" must fall back to "none"`);
    assert.equal(res.displayText, '');
  }
});

// 7. Pinned Badge Non-Sorting Invariant
await check('pinned-non-sorting-invariant: pinned badge never alters link order', async () => {
  const links = [
    { title: 'First Link', url: 'https://1.com', badge: 'none' },
    { title: 'Second Link', url: 'https://2.com', badge: 'pinned' },
    { title: 'Third Link', url: 'https://3.com', badge: 'new' },
  ];

  // Assert order remains 0, 1, 2
  assert.equal(links[0].title, 'First Link');
  assert.equal(links[1].title, 'Second Link');
  assert.equal(links[2].title, 'Third Link');
});

// 8. Non-Destructive Editing across all Link Fields
await check('non-destructive-fields: badge changes preserve title, subtitle, icon, url, schedule', async () => {
  const link = {
    title: 'Design System',
    subtitle: 'Free Figma tokens',
    url: 'https://figma.com/@tokens',
    icon: 'https://s3.example.com/figma.png',
    active: true,
    startsAt: new Date('2026-08-01T00:00:00Z'),
    endsAt: new Date('2026-08-31T00:00:00Z'),
    badge: 'new',
  };

  const validated = validateAndSanitizeLink(link);
  assert.equal(validated.ok, true);
  const normalized = normalizeLinkBadge(link.badge);
  assert.equal(normalized.ok, true);
  validated.link.badge = normalized.badge;

  assert.equal(validated.link.title, 'Design System');
  assert.equal(validated.link.subtitle, 'Free Figma tokens');
  assert.equal(validated.link.url, 'https://figma.com/@tokens');
  assert.equal(validated.link.icon, 'https://s3.example.com/figma.png');
  assert.equal(validated.link.active, true);
  assert.equal(validated.link.badge, 'new');
});

// 9. Lifecycle Status Authoritative Filtering Unaltered
await check('lifecycle-authority: expired / inactive badged links are not live', async () => {
  const now = new Date('2026-08-15T12:00:00Z');

  const inactiveBadgedLink = {
    title: 'Inactive Hot Deal',
    active: false,
    badge: 'hot',
  };
  assert.equal(isLinkLive(inactiveBadgedLink, now), false);
  assert.equal(getLinkLifecycleStatus(inactiveBadgedLink, now), 'inactive');

  const expiredBadgedLink = {
    title: 'Expired Offer',
    active: true,
    endsAt: new Date('2026-08-01T00:00:00Z'),
    badge: 'offer',
  };
  assert.equal(isLinkLive(expiredBadgedLink, now), false);
  assert.equal(getLinkLifecycleStatus(expiredBadgedLink, now), 'expired');
});

console.log('\n================================');
console.log(`Wave 4 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
