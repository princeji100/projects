/**
 * Centralized Media Provider Parser & Registry
 * Zero-dependency, deterministic URL parser for supported media embeds.
 *
 * Supported Providers:
 * 1. YouTube (Video, Shorts, youtu.be)
 * 2. Spotify (Tracks, Albums, Playlists, Artists, Shows, Episodes)
 * 3. Apple Music (Albums, Songs with ?i=, Playlists)
 * 4. SoundCloud (Tracks, Sets/Playlists)
 */

// Exact approved hostnames for strict host verification
const APPROVED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

const APPROVED_SPOTIFY_HOSTS = new Set([
  'open.spotify.com',
  'spotify.com',
]);

const APPROVED_APPLE_MUSIC_HOSTS = new Set([
  'music.apple.com',
]);

const APPROVED_SOUNDCLOUD_HOSTS = new Set([
  'soundcloud.com',
  'www.soundcloud.com',
  'm.soundcloud.com',
]);

// Spotify supported resource kinds
const SPOTIFY_KINDS = new Set(['track', 'album', 'playlist', 'artist', 'show', 'episode']);

// SoundCloud reserved system paths to ignore
const SOUNDCLOUD_RESERVED_PATHS = new Set([
  'discover',
  'stream',
  'upload',
  'you',
  'search',
  'settings',
  'messages',
  'terms-of-use',
  'pages',
  'popular',
  'charts',
  'stations',
  'jobs',
  'press',
]);

// YouTube Video ID format (standard 11-char alphanumeric + dash + underscore)
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// Spotify Base62 entity ID format (22 alphanumeric characters)
const SPOTIFY_ID_REGEX = /^[a-zA-Z0-9]{22}$/;

/**
 * Parses YouTube URLs into normalized metadata.
 *
 * @param {URL} parsedUrl
 * @returns {Object|null}
 */
function parseYouTube(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!APPROVED_YOUTUBE_HOSTS.has(hostname)) {
    return null;
  }

  let videoId = null;
  let kind = 'video';

  if (hostname === 'youtu.be') {
    // e.g. https://youtu.be/dQw4w9WgXcQ
    const pathPart = parsedUrl.pathname.slice(1).split('/')[0];
    if (pathPart && YOUTUBE_ID_REGEX.test(pathPart)) {
      videoId = pathPart;
    }
  } else {
    // e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ
    // e.g. https://www.youtube.com/shorts/dQw4w9WgXcQ
    // e.g. https://www.youtube.com/embed/dQw4w9WgXcQ
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathSegments[0] === 'watch') {
      const vParam = parsedUrl.searchParams.get('v');
      if (vParam && YOUTUBE_ID_REGEX.test(vParam)) {
        videoId = vParam;
      }
    } else if (pathSegments[0] === 'shorts' && pathSegments[1]) {
      if (YOUTUBE_ID_REGEX.test(pathSegments[1])) {
        videoId = pathSegments[1];
        kind = 'shorts';
      }
    } else if (pathSegments[0] === 'embed' && pathSegments[1]) {
      if (YOUTUBE_ID_REGEX.test(pathSegments[1])) {
        videoId = pathSegments[1];
      }
    }
  }

  if (!videoId) {
    return null;
  }

  return {
    provider: 'youtube',
    kind,
    id: videoId,
    canonicalUrl: kind === 'shorts'
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`,
    metadata: {
      videoId,
    },
  };
}

/**
 * Parses Spotify URLs into normalized metadata.
 *
 * @param {URL} parsedUrl
 * @returns {Object|null}
 */
function parseSpotify(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!APPROVED_SPOTIFY_HOSTS.has(hostname)) {
    return null;
  }

  // Path could be /track/ID or /intl-xx/track/ID or /embed/track/ID
  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  let kind = null;
  let entityId = null;

  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i].toLowerCase();
    if (SPOTIFY_KINDS.has(seg)) {
      kind = seg;
      const candidateId = segments[i + 1];
      if (candidateId && SPOTIFY_ID_REGEX.test(candidateId)) {
        entityId = candidateId;
      }
      break;
    }
  }

  if (!kind || !entityId) {
    return null;
  }

  return {
    provider: 'spotify',
    kind,
    id: entityId,
    canonicalUrl: `https://open.spotify.com/${kind}/${entityId}`,
    metadata: {
      kind,
      entityId,
    },
  };
}

/**
 * Parses Apple Music URLs into normalized metadata.
 *
 * @param {URL} parsedUrl
 * @returns {Object|null}
 */
function parseAppleMusic(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!APPROVED_APPLE_MUSIC_HOSTS.has(hostname)) {
    return null;
  }

  // Apple Music format: /{storefront}/album/{name}/{id} (optional ?i=songId)
  // or /{storefront}/playlist/{name}/{id}
  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  if (segments.length < 3) {
    return null;
  }

  const storefront = segments[0].toLowerCase();
  // Valid storefront is a 2-letter ISO country code or "intl"
  if (!/^[a-z]{2}$/.test(storefront) && storefront !== 'intl') {
    return null;
  }

  const resourceType = segments[1].toLowerCase();
  let kind = null;
  let id = null;
  let name = null;
  let songId = null;

  if (resourceType === 'album' && segments.length >= 4) {
    name = decodeURIComponent(segments[2]);
    id = segments[3];
    kind = 'album';

    // Check if a specific track is selected via ?i=
    const iParam = parsedUrl.searchParams.get('i');
    if (iParam && /^\d+$/.test(iParam)) {
      songId = iParam;
      kind = 'song';
    }
  } else if (resourceType === 'playlist' && segments.length >= 4) {
    name = decodeURIComponent(segments[2]);
    id = segments[3];
    kind = 'playlist';
  } else {
    return null;
  }

  if (!id) {
    return null;
  }

  // Construct clean canonical URL
  let canonicalUrl = `https://music.apple.com/${storefront}/${resourceType}/${encodeURIComponent(name)}/${id}`;
  if (songId) {
    canonicalUrl += `?i=${songId}`;
  }

  return {
    provider: 'apple-music',
    kind,
    id: songId || id,
    canonicalUrl,
    metadata: {
      storefront,
      name,
      albumId: resourceType === 'album' ? id : null,
      songId: songId || null,
      playlistId: resourceType === 'playlist' ? id : null,
    },
  };
}

/**
 * Parses SoundCloud URLs into normalized metadata.
 *
 * @param {URL} parsedUrl
 * @returns {Object|null}
 */
function parseSoundCloud(parsedUrl) {
  const hostname = parsedUrl.hostname.toLowerCase();
  if (!APPROVED_SOUNDCLOUD_HOSTS.has(hostname)) {
    return null;
  }

  // Format: /{artist}/{track} or /{artist}/sets/{playlist}
  const segments = parsedUrl.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    return null;
  }

  const artist = segments[0].toLowerCase();
  if (SOUNDCLOUD_RESERVED_PATHS.has(artist)) {
    return null;
  }

  let kind = 'track';
  let trackOrSet = segments[1];

  if (trackOrSet.toLowerCase() === 'sets' && segments[2]) {
    kind = 'set';
    trackOrSet = segments[2];
  }

  // Construct canonical URL without tracking parameters or query strings
  const canonicalUrl = kind === 'set'
    ? `https://soundcloud.com/${segments[0]}/sets/${segments[2]}`
    : `https://soundcloud.com/${segments[0]}/${segments[1]}`;

  return {
    provider: 'soundcloud',
    kind,
    id: null, // SoundCloud does not use stable IDs in public URLs; handled via canonical URL
    canonicalUrl,
    metadata: {
      artist: segments[0],
      resource: trackOrSet,
    },
  };
}

/**
 * Master parser: Deterministically parses any supported media URL into structured metadata.
 * Returns null if the URL is not a supported media provider or is malformed.
 *
 * @param {string | null | undefined} input
 * @returns {{ provider: 'youtube'|'spotify'|'apple-music'|'soundcloud', kind: string, id: string|null, canonicalUrl: string, metadata: Object } | null}
 */
export function parseMediaUrl(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  // Reject dangerous schemes or non-HTTP(S)
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('vbscript:')
  ) {
    return null;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    return null;
  }

  // Require HTTP or HTTPS protocol
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return null;
  }

  // Strip credentials if present
  if (parsedUrl.username || parsedUrl.password) {
    return null;
  }

  const hostname = parsedUrl.hostname.toLowerCase();

  if (APPROVED_YOUTUBE_HOSTS.has(hostname)) {
    return parseYouTube(parsedUrl);
  }

  if (APPROVED_SPOTIFY_HOSTS.has(hostname)) {
    return parseSpotify(parsedUrl);
  }

  if (APPROVED_APPLE_MUSIC_HOSTS.has(hostname)) {
    return parseAppleMusic(parsedUrl);
  }

  if (APPROVED_SOUNDCLOUD_HOSTS.has(hostname)) {
    return parseSoundCloud(parsedUrl);
  }

  return null;
}

/**
 * Builds an official, deterministic Apple Music embed iframe URL.
 *
 * @param {Object} media - Output from parseMediaUrl or Apple Music metadata
 * @returns {string|null} - e.g. "https://embed.music.apple.com/us/album/abbey-road-2019-mix/1474815798"
 */
export function buildAppleMusicEmbedUrl(media) {
  if (!media || typeof media !== 'object') {
    return null;
  }

  const meta = media.metadata || media;
  const storefront = typeof meta.storefront === 'string' ? meta.storefront.toLowerCase().trim() : '';
  if (!/^[a-z]{2}$/.test(storefront) && storefront !== 'intl') {
    return null;
  }

  const kind = media.kind || meta.kind;
  const name = typeof meta.name === 'string' && meta.name ? encodeURIComponent(meta.name) : '';

  if (kind === 'song' && meta.albumId && meta.songId) {
    const slugPart = name ? `${name}/` : '';
    return `https://embed.music.apple.com/${storefront}/album/${slugPart}${encodeURIComponent(meta.albumId)}?i=${encodeURIComponent(meta.songId)}`;
  }

  if (kind === 'album' && meta.albumId) {
    const slugPart = name ? `${name}/` : '';
    return `https://embed.music.apple.com/${storefront}/album/${slugPart}${encodeURIComponent(meta.albumId)}`;
  }

  if (kind === 'playlist' && meta.playlistId) {
    const slugPart = name ? `${name}/` : '';
    return `https://embed.music.apple.com/${storefront}/playlist/${slugPart}${encodeURIComponent(meta.playlistId)}`;
  }

  return null;
}

/**
 * Builds an official, deterministic SoundCloud embed iframe URL.
 * Uses official w.soundcloud.com player with validated canonical URL.
 *
 * @param {Object} media - Output from parseMediaUrl or SoundCloud metadata
 * @returns {string|null} - e.g. "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Ftrack&auto_play=false&show_comments=false&hide_related=true"
 */
export function buildSoundCloudEmbedUrl(media) {
  if (!media || typeof media !== 'object') {
    return null;
  }

  if (media.provider !== 'soundcloud' || !media.canonicalUrl) {
    return null;
  }

  try {
    const parsed = new URL(media.canonicalUrl);
    if (!APPROVED_SOUNDCLOUD_HOSTS.has(parsed.hostname.toLowerCase())) {
      return null;
    }

    const params = new URLSearchParams({
      url: media.canonicalUrl,
      auto_play: 'false',
      hide_related: 'true',
      show_comments: 'false',
      show_user: 'true',
      show_reposts: 'false',
      show_teaser: 'false',
    });

    return `https://w.soundcloud.com/player/?${params.toString()}`;
  } catch {
    return null;
  }
}


