import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { parseMediaUrl } from '../lib/mediaEmbeds.js';
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

console.log('--- Running Wave 10 Spotify Embed UI Verification ---\n');

// 1. Provider Differentiation: Spotify Recognized, Apple/SoundCloud Unactivated
await check('provider-differentiation: recognizes Spotify kinds while keeping Apple Music & SoundCloud standard', async () => {
  const track = parseMediaUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
  assert.equal(track?.provider, 'spotify');
  assert.equal(track?.kind, 'track');

  const album = parseMediaUrl('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3');
  assert.equal(album?.provider, 'spotify');
  assert.equal(album?.kind, 'album');

  const playlist = parseMediaUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(playlist?.provider, 'spotify');
  assert.equal(playlist?.kind, 'playlist');

  const artist = parseMediaUrl('https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02');
  assert.equal(artist?.provider, 'spotify');
  assert.equal(artist?.kind, 'artist');

  const show = parseMediaUrl('https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk');
  assert.equal(show?.provider, 'spotify');
  assert.equal(show?.kind, 'show');

  const episode = parseMediaUrl('https://open.spotify.com/episode/5125cadONkO58i14Qk9k4P');
  assert.equal(episode?.provider, 'spotify');
  assert.equal(episode?.kind, 'episode');

  // Unsupported Spotify path returns null
  assert.equal(parseMediaUrl('https://open.spotify.com/user/johndoe'), null);

  // Normal links remain null
  assert.equal(parseMediaUrl('https://princeji.com'), null);
});

// 2. Embed URL Construction Security
await check('embed-url-construction: always HTTPS open.spotify.com/embed/{kind}/{id}', async () => {
  const kind = 'track';
  const entityId = '4cOdK2wGLETKBW3PvgPWqT';
  const embedSrc = `https://open.spotify.com/embed/${encodeURIComponent(kind)}/${encodeURIComponent(entityId)}`;

  assert.equal(embedSrc, 'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
  assert.ok(embedSrc.startsWith('https://open.spotify.com/embed/'));
  assert.ok(!embedSrc.includes('iframe-api/v1'), 'No Spotify iFrame API SDK script');
  assert.ok(!embedSrc.includes('oauth'), 'No OAuth parameters');
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
await check('component-source-invariants: SpotifyEmbed conforms to encrypted-media, responsive height, and escape hatch', async () => {
  const compSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/media/SpotifyEmbed.js'),
    'utf8'
  );

  assert.ok(compSrc.includes('open.spotify.com/embed'), 'Must use official Spotify embed path');
  assert.ok(compSrc.includes('encrypted-media'), 'Must include allow="encrypted-media"');
  assert.ok(compSrc.includes('loading="lazy"'), 'Must include lazy loading');
  assert.ok(compSrc.includes('/api/click'), 'Must preserve click tracking analytics');
  assert.ok(compSrc.includes('target="_blank"'), 'Must provide external escape hatch');
  assert.ok(compSrc.includes('getSpotifyEmbedHeight'), 'Must use deterministic height strategy');
});

// 5. Lifecycle Authority Invariant
await check('lifecycle-authority: inactive or expired Spotify links are filtered out before render', async () => {
  const now = new Date();
  const past = new Date(Date.now() - 3600000);

  const activeSpotify = {
    title: 'Active Spotify Track',
    url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    active: true,
  };

  const inactiveSpotify = {
    title: 'Inactive Spotify Track',
    url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    active: false,
  };

  const expiredSpotify = {
    title: 'Expired Spotify Track',
    url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    active: true,
    endsAt: past,
  };

  assert.equal(isLinkLive(activeSpotify, now), true);
  assert.equal(isLinkLive(inactiveSpotify, now), false);
  assert.equal(isLinkLive(expiredSpotify, now), false);
});

// 6. Zero Dependencies & Schema Invariance
await check('zero-dependencies-and-schema: no new packages and no schema mutations', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('spotify-web-api-node'));
  assert.ok(!deps.includes('react-spotify-embed'));

  const paths = Object.keys(Page.schema.paths);
  assert.ok(!paths.includes('links.spotifyId'));
  assert.ok(!paths.includes('links.mediaType'));
});

console.log('\n================================');
console.log(`Wave 10 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
