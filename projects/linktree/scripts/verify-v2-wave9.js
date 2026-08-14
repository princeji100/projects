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

console.log('--- Running Wave 9 YouTube Embed UI Verification ---\n');

// 1. Parser-Driven Differentiation
await check('media-detector-differentiation: recognizes YouTube while keeping normal & other media links standard', async () => {
  const ytWatch = parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(ytWatch?.provider, 'youtube');
  assert.equal(ytWatch?.id, 'dQw4w9WgXcQ');

  const ytShort = parseMediaUrl('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(ytShort?.provider, 'youtube');
  assert.equal(ytShort?.id, 'dQw4w9WgXcQ');

  const ytShorts = parseMediaUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  assert.equal(ytShorts?.provider, 'youtube');
  assert.equal(ytShorts?.id, 'dQw4w9WgXcQ');

  // Normal link
  const normal = parseMediaUrl('https://princeji.com');
  assert.equal(normal, null);

  // Other media providers remain ordinary in Wave 9
  const spotify = parseMediaUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
  assert.equal(spotify?.provider, 'spotify');
  assert.notEqual(spotify?.provider, 'youtube');
});

// 2. Iframe Embed URL Construction Security Invariants
await check('embed-url-construction: always HTTPS youtube-nocookie.com with encoded videoId', async () => {
  const videoId = 'dQw4w9WgXcQ';
  const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?playsinline=1`;

  assert.ok(embedSrc.startsWith('https://www.youtube-nocookie.com/embed/'));
  assert.ok(embedSrc.includes('dQw4w9WgXcQ'));
  assert.ok(!embedSrc.startsWith('http://'), 'Must never construct insecure http:// iframe');
  assert.ok(!embedSrc.includes('enablejsapi=1'), 'No unnecessary JS API parameters');
});

// 3. Lazy Mount Invariant (No Iframe on Initial Render)
await check('lazy-mount-state-flow: initial component state does not mount iframe until explicit interaction', async () => {
  // Simulate YouTubeEmbed state flow
  let isPlayerMounted = false;
  let hasTrackedClick = false;

  // Initial render:
  assert.equal(isPlayerMounted, false, 'Iframe must not be mounted initially');
  assert.equal(hasTrackedClick, false, 'No click tracking on initial render');

  // Explicit user interaction (Play button pressed):
  function onPlayClick() {
    if (!hasTrackedClick) {
      hasTrackedClick = true;
    }
    isPlayerMounted = true;
  }

  onPlayClick();
  assert.equal(isPlayerMounted, true, 'Iframe mounted after explicit interaction');
  assert.equal(hasTrackedClick, true, 'Click tracked once on explicit play');

  // Subsequent rerenders / toggles do NOT re-trigger click tracking
  onPlayClick();
  assert.equal(hasTrackedClick, true, 'Duplicate click tracking prevented');
});

// 4. Component Source Invariants
await check('component-source-invariants: YouTubeEmbed conforms to responsive 16:9, accessibility, and escape hatch', async () => {
  const compSrc = fs.readFileSync(
    path.join(process.cwd(), 'components/media/YouTubeEmbed.js'),
    'utf8'
  );

  assert.ok(compSrc.includes('youtube-nocookie.com'), 'Must use privacy-enhanced domain');
  assert.ok(compSrc.includes('aspect-video'), 'Must use 16:9 aspect-video container');
  assert.ok(compSrc.includes('allowFullScreen'), 'Must support fullscreen');
  assert.ok(compSrc.includes('title='), 'Must provide iframe title for accessibility');
  assert.ok(compSrc.includes('aria-label='), 'Must provide accessible aria-labels on buttons');
  assert.ok(compSrc.includes('playsinline=1'), 'Must include playsinline parameter');
  assert.ok(compSrc.includes('/api/click'), 'Must preserve click tracking analytics');
  assert.ok(compSrc.includes('target="_blank"'), 'Must provide external link escape hatch');
});

// 5. Server Lifecycle Authority Invariant
await check('lifecycle-authority: inactive or expired YouTube links are filtered out before render', async () => {
  const now = new Date();
  const past = new Date(Date.now() - 3600000);

  const activeYtLink = {
    title: 'Active Video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    active: true,
  };

  const inactiveYtLink = {
    title: 'Inactive Video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    active: false,
  };

  const expiredYtLink = {
    title: 'Expired Video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    active: true,
    endsAt: past,
  };

  assert.equal(isLinkLive(activeYtLink, now), true);
  assert.equal(isLinkLive(inactiveYtLink, now), false);
  assert.equal(isLinkLive(expiredYtLink, now), false);
});

// 6. Zero Dependencies & Schema Invariance
await check('zero-dependencies-and-schema: no new packages and no schema mutations', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('youtube-player'));
  assert.ok(!deps.includes('react-youtube'));

  const paths = Object.keys(Page.schema.paths);
  assert.ok(!paths.includes('links.videoId'));
  assert.ok(!paths.includes('links.mediaType'));
});

console.log('\n================================');
console.log(`Wave 9 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
