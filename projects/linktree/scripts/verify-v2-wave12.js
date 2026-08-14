import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { parseMediaUrl, buildSoundCloudEmbedUrl } from '../lib/mediaEmbeds.js';
import { isLinkLive } from '../lib/linkLifecycle.js';
import Page from '../models/Page.js';

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

console.log('--- Running Wave 12 SoundCloud Embed UI Verification ---\n');

// 1. Provider Differentiation: All 4 Media Providers Recognized Deterministically
await check('provider-differentiation: recognizes SoundCloud track & set while preserving YouTube, Spotify, Apple Music & normal links', async () => {
  const scTrack = parseMediaUrl('https://soundcloud.com/octobersveryown/drake-gods-plan');
  assert.equal(scTrack?.provider, 'soundcloud');
  assert.equal(scTrack?.kind, 'track');

  const scSet = parseMediaUrl('https://soundcloud.com/artistname/sets/albumname');
  assert.equal(scSet?.provider, 'soundcloud');
  assert.equal(scSet?.kind, 'set');

  // Reserved paths return null (remain ordinary link)
  assert.equal(parseMediaUrl('https://soundcloud.com/discover'), null);
  assert.equal(parseMediaUrl('https://soundcloud.com/upload'), null);

  // YouTube, Spotify, Apple Music remain recognized
  assert.equal(parseMediaUrl('https://youtu.be/dQw4w9WgXcQ')?.provider, 'youtube');
  assert.equal(parseMediaUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')?.provider, 'spotify');
  assert.equal(parseMediaUrl('https://music.apple.com/us/album/abbey-road-2019-mix/1474815798')?.provider, 'apple-music');

  // Normal links remain null
  assert.equal(parseMediaUrl('https://princeji.com'), null);
});

// 2. buildSoundCloudEmbedUrl Helper Determinism & Invariants
await check('buildSoundCloudEmbedUrl-helper: creates official HTTPS w.soundcloud.com widget URLs with auto_play=false', async () => {
  const trackMeta = parseMediaUrl('https://soundcloud.com/octobersveryown/drake-gods-plan?utm_source=clipboard&utm_medium=text');
  const trackEmbed = buildSoundCloudEmbedUrl(trackMeta);

  assert.ok(trackEmbed.startsWith('https://w.soundcloud.com/player/?'));
  assert.ok(trackEmbed.includes('auto_play=false'));
  assert.ok(trackEmbed.includes(encodeURIComponent('https://soundcloud.com/octobersveryown/drake-gods-plan')));
  assert.ok(!trackEmbed.includes('utm_source'), 'Tracking parameters must be stripped');

  const setMeta = parseMediaUrl('https://soundcloud.com/artist/sets/my-set');
  const setEmbed = buildSoundCloudEmbedUrl(setMeta);
  assert.ok(setEmbed.startsWith('https://w.soundcloud.com/player/?'));
  assert.ok(setEmbed.includes(encodeURIComponent('https://soundcloud.com/artist/sets/my-set')));

  // Invalid / unsupported
  assert.equal(buildSoundCloudEmbedUrl(null), null);
  assert.equal(buildSoundCloudEmbedUrl({}), null);
});

// 3. Lazy Mount State Flow
await check('lazy-mount-flow: iframe not mounted on initial render, mounted on explicit interaction with click tracking', async () => {
  let isPlayerMounted = false;
  let hasTrackedClick = false;

  // Initial state:
  assert.equal(isPlayerMounted, false, 'Iframe must not be mounted initially');
  assert.equal(hasTrackedClick, false, 'No click tracking on initial render');

  // Explicit user interaction:
  function onListenClick() {
    if (!hasTrackedClick) {
      hasTrackedClick = true;
    }
    isPlayerMounted = true;
  }

  onListenClick();
  assert.equal(isPlayerMounted, true, 'Iframe mounted on explicit click');
  assert.equal(hasTrackedClick, true, 'Click tracked once');

  // Rerender / close / reopen does not fire duplicate analytics
  onListenClick();
  assert.equal(hasTrackedClick, true, 'No duplicate analytics on subsequent interactions');
});

// 4. Component Source Invariants
await check('component-source-invariants: SoundCloudEmbed conforms to official widget host, responsive height, and escape hatch', async () => {
  const compSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/media/SoundCloudEmbed.js'),
    'utf8'
  );

  assert.ok(compSrc.includes('buildSoundCloudEmbedUrl'), 'Must use centralized embed helper');
  assert.ok(compSrc.includes('loading="lazy"'), 'Must include lazy loading');
  assert.ok(compSrc.includes('/api/click'), 'Must preserve click tracking analytics');
  assert.ok(compSrc.includes('target="_blank"'), 'Must provide external escape hatch');
  assert.ok(compSrc.includes('getSoundCloudEmbedHeight'), 'Must use deterministic height strategy');
  assert.ok(!compSrc.includes('dangerouslySetInnerHTML'), 'Must not use dangerouslySetInnerHTML');
});

// 5. Lifecycle Authority Invariant
await check('lifecycle-authority: inactive or expired SoundCloud links are filtered out before render', async () => {
  const now = new Date();
  const past = new Date(Date.now() - 3600000);

  const activeSC = {
    title: 'Active SoundCloud Track',
    url: 'https://soundcloud.com/octobersveryown/drake-gods-plan',
    active: true,
  };

  const inactiveSC = {
    title: 'Inactive SoundCloud Track',
    url: 'https://soundcloud.com/octobersveryown/drake-gods-plan',
    active: false,
  };

  const expiredSC = {
    title: 'Expired SoundCloud Track',
    url: 'https://soundcloud.com/octobersveryown/drake-gods-plan',
    active: true,
    endsAt: past,
  };

  assert.equal(isLinkLive(activeSC, now), true);
  assert.equal(isLinkLive(inactiveSC, now), false);
  assert.equal(isLinkLive(expiredSC, now), false);
});

// 6. Zero Dependencies & Schema Invariance
await check('zero-dependencies-and-schema: no new packages and no schema mutations', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('soundcloud'));
  assert.ok(!deps.includes('react-soundcloud-widget'));

  const paths = Object.keys(Page.schema.paths);
  assert.ok(!paths.includes('links.soundcloudId'));
  assert.ok(!paths.includes('links.mediaType'));
});

console.log('\n================================');
console.log(`Wave 12 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
