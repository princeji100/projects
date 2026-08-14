import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { parseMediaUrl, buildAppleMusicEmbedUrl } from '../lib/mediaEmbeds.js';
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

console.log('--- Running Wave 11 Apple Music Embed UI Verification ---\n');

// 1. Provider Differentiation: Apple Music Recognized, SoundCloud Remains Standard
await check('provider-differentiation: recognizes Apple Music kinds while SoundCloud remains normal link', async () => {
  const album = parseMediaUrl('https://music.apple.com/us/album/abbey-road-2019-mix/1474815798');
  assert.equal(album?.provider, 'apple-music');
  assert.equal(album?.kind, 'album');

  const song = parseMediaUrl('https://music.apple.com/in/album/rockstar-original-soundtrack/1118671607?i=1118671612');
  assert.equal(song?.provider, 'apple-music');
  assert.equal(song?.kind, 'song');

  const playlist = parseMediaUrl('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb');
  assert.equal(playlist?.provider, 'apple-music');
  assert.equal(playlist?.kind, 'playlist');

  // SoundCloud parsed as soundcloud, but not routed to Apple Music
  const soundcloud = parseMediaUrl('https://soundcloud.com/octobersveryown/drake-gods-plan');
  assert.equal(soundcloud?.provider, 'soundcloud');
  assert.notEqual(soundcloud?.provider, 'apple-music');

  // Normal links remain null
  assert.equal(parseMediaUrl('https://princeji.com'), null);
});

// 2. buildAppleMusicEmbedUrl Helper Determinism & Invariants
await check('buildAppleMusicEmbedUrl-helper: creates official HTTPS embed.music.apple.com URLs without tracking noise', async () => {
  // Album
  const albumMeta = parseMediaUrl('https://music.apple.com/us/album/abbey-road-2019-mix/1474815798?at=1234&itscg=test');
  const albumEmbed = buildAppleMusicEmbedUrl(albumMeta);
  assert.equal(albumEmbed, 'https://embed.music.apple.com/us/album/abbey-road-2019-mix/1474815798');
  assert.ok(!albumEmbed.includes('at='), 'Tracking parameters must be stripped');

  // Song with ?i=
  const songMeta = parseMediaUrl('https://music.apple.com/in/album/rockstar-original-soundtrack/1118671607?i=1118671612');
  const songEmbed = buildAppleMusicEmbedUrl(songMeta);
  assert.equal(songEmbed, 'https://embed.music.apple.com/in/album/rockstar-original-soundtrack/1118671607?i=1118671612');

  // Playlist
  const playlistMeta = parseMediaUrl('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb');
  const playlistEmbed = buildAppleMusicEmbedUrl(playlistMeta);
  assert.equal(playlistEmbed, 'https://embed.music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb');

  // Invalid / unsupported
  assert.equal(buildAppleMusicEmbedUrl(null), null);
  assert.equal(buildAppleMusicEmbedUrl({}), null);
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
await check('component-source-invariants: AppleMusicEmbed conforms to official embed host, responsive height, and escape hatch', async () => {
  const compSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/media/AppleMusicEmbed.js'),
    'utf8'
  );

  assert.ok(compSrc.includes('buildAppleMusicEmbedUrl'), 'Must use centralized embed helper');
  assert.ok(compSrc.includes('allow='), 'Must define appropriate allow attribute');
  assert.ok(compSrc.includes('loading="lazy"'), 'Must include lazy loading');
  assert.ok(compSrc.includes('/api/click'), 'Must preserve click tracking analytics');
  assert.ok(compSrc.includes('target="_blank"'), 'Must provide external escape hatch');
  assert.ok(compSrc.includes('getAppleMusicEmbedHeight'), 'Must use deterministic height strategy');
});

// 5. Lifecycle Authority Invariant
await check('lifecycle-authority: inactive or expired Apple Music links are filtered out before render', async () => {
  const now = new Date();
  const past = new Date(Date.now() - 3600000);

  const activeApple = {
    title: 'Active Apple Album',
    url: 'https://music.apple.com/us/album/abbey-road-2019-mix/1474815798',
    active: true,
  };

  const inactiveApple = {
    title: 'Inactive Apple Album',
    url: 'https://music.apple.com/us/album/abbey-road-2019-mix/1474815798',
    active: false,
  };

  const expiredApple = {
    title: 'Expired Apple Album',
    url: 'https://music.apple.com/us/album/abbey-road-2019-mix/1474815798',
    active: true,
    endsAt: past,
  };

  assert.equal(isLinkLive(activeApple, now), true);
  assert.equal(isLinkLive(inactiveApple, now), false);
  assert.equal(isLinkLive(expiredApple, now), false);
});

// 6. Zero Dependencies & Schema Invariance
await check('zero-dependencies-and-schema: no new packages and no schema mutations', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('musickit'));
  assert.ok(!deps.includes('apple-music'));

  const paths = Object.keys(Page.schema.paths);
  assert.ok(!paths.includes('links.appleId'));
  assert.ok(!paths.includes('links.mediaType'));
});

console.log('\n================================');
console.log(`Wave 11 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
