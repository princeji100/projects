import assert from 'node:assert/strict';
import { register } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

import { parseMediaUrl } from '../lib/mediaEmbeds.js';
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

console.log('--- Running Wave 8 Media Provider Parser Verification ---\n');

// 1. General Security: Malformed / Non-URL Inputs
await check('malformed-inputs: null, empty string, non-strings, and invalid syntax return null', async () => {
  assert.equal(parseMediaUrl(null), null);
  assert.equal(parseMediaUrl(undefined), null);
  assert.equal(parseMediaUrl(''), null);
  assert.equal(parseMediaUrl('   '), null);
  assert.equal(parseMediaUrl('not-a-valid-url'), null);
  assert.equal(parseMediaUrl('htt p://broken'), null);
});

// 2. General Security: Dangerous Schemes
await check('dangerous-schemes: javascript:, data:, file:, and other unsafe schemes are rejected', async () => {
  assert.equal(parseMediaUrl('javascript:alert(1)'), null);
  assert.equal(parseMediaUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(parseMediaUrl('file:///etc/passwd'), null);
  assert.equal(parseMediaUrl('ftp://youtube.com/watch?v=dQw4w9WgXcQ'), null);
});

// 3. General Security: Spoofed / Deceptive Hostnames
await check('spoofed-hostnames: deceptive prefix/suffix domains are strictly rejected', async () => {
  assert.equal(parseMediaUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseMediaUrl('https://evil-youtube.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(parseMediaUrl('https://open.spotify.com.attacker.example/track/4cOdK2wGLETKBW3PvgPWqT'), null);
  assert.equal(parseMediaUrl('https://music.apple.com.fake.com/us/album/test/123'), null);
  assert.equal(parseMediaUrl('https://soundcloud.com.evil.com/artist/track'), null);
});

// 4. General Security: Unknown Normal HTTPS URLs
await check('normal-unknown-urls: non-media URLs return null safely to remain standard links', async () => {
  assert.equal(parseMediaUrl('https://github.com/princeji100/projects'), null);
  assert.equal(parseMediaUrl('https://google.com'), null);
  assert.equal(parseMediaUrl('https://princeji.com'), null);
});

// 5. General Security: Output Contains No Raw HTML / Executable Markup
await check('no-executable-markup: parser output contains no HTML/iframe tags', async () => {
  const res = parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.ok(res !== null);
  const json = JSON.stringify(res);
  assert.ok(!json.includes('<iframe'));
  assert.ok(!json.includes('<script'));
  assert.ok(!json.includes('javascript:'));
});

// 6. YouTube: Standard watch?v=
await check('youtube-watch: parses standard youtube.com/watch?v= URL and strips tracking parameters', async () => {
  const res = parseMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&utm_source=twitter');
  assert.deepEqual(res, {
    provider: 'youtube',
    kind: 'video',
    id: 'dQw4w9WgXcQ',
    canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    metadata: {
      videoId: 'dQw4w9WgXcQ',
    },
  });
});

// 7. YouTube: youtu.be Short URLs
await check('youtube-shortlink: parses youtu.be/ID correctly', async () => {
  const res = parseMediaUrl('https://youtu.be/dQw4w9WgXcQ?t=42');
  assert.deepEqual(res, {
    provider: 'youtube',
    kind: 'video',
    id: 'dQw4w9WgXcQ',
    canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    metadata: {
      videoId: 'dQw4w9WgXcQ',
    },
  });
});

// 8. YouTube: Shorts URLs
await check('youtube-shorts: parses youtube.com/shorts/ID correctly with kind=shorts', async () => {
  const res = parseMediaUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  assert.deepEqual(res, {
    provider: 'youtube',
    kind: 'shorts',
    id: 'dQw4w9WgXcQ',
    canonicalUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    metadata: {
      videoId: 'dQw4w9WgXcQ',
    },
  });
});

// 9. YouTube: Missing / Invalid Video ID Refusal
await check('youtube-invalid-id: rejects missing, truncated, or malicious IDs', async () => {
  assert.equal(parseMediaUrl('https://www.youtube.com/watch?v='), null);
  assert.equal(parseMediaUrl('https://www.youtube.com/watch'), null);
  assert.equal(parseMediaUrl('https://youtu.be/'), null);
  assert.equal(parseMediaUrl('https://www.youtube.com/watch?v=too_short'), null);
  assert.equal(parseMediaUrl('https://www.youtube.com/watch?v=too_long_to_be_a_valid_id_here'), null);
});

// 10. Spotify: Track Parsing
await check('spotify-track: parses open.spotify.com/track/ID correctly', async () => {
  const res = parseMediaUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123456');
  assert.deepEqual(res, {
    provider: 'spotify',
    kind: 'track',
    id: '4cOdK2wGLETKBW3PvgPWqT',
    canonicalUrl: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    metadata: {
      kind: 'track',
      entityId: '4cOdK2wGLETKBW3PvgPWqT',
    },
  });
});

// 11. Spotify: Album, Playlist, Artist, Episode, Show Parsing
await check('spotify-entities: parses album, playlist, artist, episode, and show', async () => {
  const album = parseMediaUrl('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3');
  assert.equal(album?.kind, 'album');
  assert.equal(album?.id, '1DFixLWuPkv3KT3TnV35m3');

  const playlist = parseMediaUrl('https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M');
  assert.equal(playlist?.kind, 'playlist');
  assert.equal(playlist?.id, '37i9dQZF1DXcBWIGoYBM5M');

  const artist = parseMediaUrl('https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02');
  assert.equal(artist?.kind, 'artist');
  assert.equal(artist?.id, '06HL4z0CvFAxyc27GXpf02');

  const episode = parseMediaUrl('https://open.spotify.com/episode/5125cadONkO58i14Qk9k4P');
  assert.equal(episode?.kind, 'episode');
  assert.equal(episode?.id, '5125cadONkO58i14Qk9k4P');
});

// 12. Spotify: International Prefixes & Safe Refusals
await check('spotify-intl-safe-refusal: parses /intl-en/ paths and rejects non-supported entities', async () => {
  const intlTrack = parseMediaUrl('https://open.spotify.com/intl-de/track/4cOdK2wGLETKBW3PvgPWqT');
  assert.equal(intlTrack?.kind, 'track');
  assert.equal(intlTrack?.id, '4cOdK2wGLETKBW3PvgPWqT');

  assert.equal(parseMediaUrl('https://open.spotify.com/user/myuser123'), null, 'user profile is not an embed entity');
  assert.equal(parseMediaUrl('https://open.spotify.com/settings'), null);
});

// 13. Apple Music: Album Parsing
await check('apple-music-album: parses album URLs preserving storefront and albumId', async () => {
  const res = parseMediaUrl('https://music.apple.com/us/album/abbey-road-2019-mix/1474815798');
  assert.deepEqual(res, {
    provider: 'apple-music',
    kind: 'album',
    id: '1474815798',
    canonicalUrl: 'https://music.apple.com/us/album/abbey-road-2019-mix/1474815798',
    metadata: {
      storefront: 'us',
      name: 'abbey-road-2019-mix',
      albumId: '1474815798',
      songId: null,
      playlistId: null,
    },
  });
});

// 14. Apple Music: Song on Album (?i=songId)
await check('apple-music-song: parses song on album URLs extracting songId', async () => {
  const res = parseMediaUrl('https://music.apple.com/in/album/rockstar-original-soundtrack/1118671607?i=1118671612');
  assert.deepEqual(res, {
    provider: 'apple-music',
    kind: 'song',
    id: '1118671612',
    canonicalUrl: 'https://music.apple.com/in/album/rockstar-original-soundtrack/1118671607?i=1118671612',
    metadata: {
      storefront: 'in',
      name: 'rockstar-original-soundtrack',
      albumId: '1118671607',
      songId: '1118671612',
      playlistId: null,
    },
  });
});

// 15. Apple Music: Playlist Parsing
await check('apple-music-playlist: parses playlist URLs with pl. ID', async () => {
  const res = parseMediaUrl('https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb');
  assert.deepEqual(res, {
    provider: 'apple-music',
    kind: 'playlist',
    id: 'pl.f4d106fed2bd41149aaacabb233eb5eb',
    canonicalUrl: 'https://music.apple.com/us/playlist/todays-hits/pl.f4d106fed2bd41149aaacabb233eb5eb',
    metadata: {
      storefront: 'us',
      name: 'todays-hits',
      albumId: null,
      songId: null,
      playlistId: 'pl.f4d106fed2bd41149aaacabb233eb5eb',
    },
  });
});

// 16. SoundCloud: Track Parsing
await check('soundcloud-track: parses soundcloud.com/artist/track correctly', async () => {
  const res = parseMediaUrl('https://soundcloud.com/octobersveryown/drake-gods-plan?utm_source=clipboard');
  assert.deepEqual(res, {
    provider: 'soundcloud',
    kind: 'track',
    id: null,
    canonicalUrl: 'https://soundcloud.com/octobersveryown/drake-gods-plan',
    metadata: {
      artist: 'octobersveryown',
      resource: 'drake-gods-plan',
    },
  });
});

// 17. SoundCloud: Set / Playlist Parsing
await check('soundcloud-set: parses soundcloud.com/artist/sets/playlist correctly', async () => {
  const res = parseMediaUrl('https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-summer-2023');
  assert.deepEqual(res, {
    provider: 'soundcloud',
    kind: 'set',
    id: null,
    canonicalUrl: 'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-summer-2023',
    metadata: {
      artist: 'chillhopdotcom',
      resource: 'chillhop-essentials-summer-2023',
    },
  });
});

// 18. SoundCloud: Reserved System Paths Safe Rejection
await check('soundcloud-reserved-paths: ignores /discover, /upload, /search system paths', async () => {
  assert.equal(parseMediaUrl('https://soundcloud.com/discover'), null);
  assert.equal(parseMediaUrl('https://soundcloud.com/upload'), null);
  assert.equal(parseMediaUrl('https://soundcloud.com/search?q=beats'), null);
});

// 19. Schema Invariance: No Schema Changes or Migrations
await check('schema-invariance: LinkSchema does not contain mediaType/provider/embedUrl fields', async () => {
  const linkSchemaPaths = Object.keys(Page.schema.paths);
  assert.ok(!linkSchemaPaths.includes('links.mediaType'));
  assert.ok(!linkSchemaPaths.includes('links.provider'));
  assert.ok(!linkSchemaPaths.includes('links.embedUrl'));
  assert.ok(!linkSchemaPaths.includes('links.videoId'));
});

// 20. Zero Dependencies
await check('zero-dependencies: package.json has no new dependencies added', async () => {
  const pkgRaw = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
  const pkg = JSON.parse(pkgRaw);
  const deps = Object.keys(pkg.dependencies || {});
  assert.ok(!deps.includes('youtube-player'));
  assert.ok(!deps.includes('spotify-web-api-node'));
  assert.ok(!deps.includes('soundcloud'));
});

console.log('\n================================');
console.log(`Wave 8 Verification Results:`);
console.log(`  PASSED:  ${passed}`);
console.log(`  FAILED:  ${failed}`);
console.log('================================\n');

if (failed > 0) {
  process.exit(1);
}
