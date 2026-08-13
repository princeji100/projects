/**
 * Server-Side Analytics Metadata Parser & Normalizer
 * Extracts normalized device types and clean referrer domains without external dependencies.
 */

/**
 * Classifies a User-Agent string into a normalized device category.
 *
 * @param {string | null | undefined} userAgent
 * @returns {'mobile' | 'desktop' | 'tablet' | 'other'}
 */
export function parseDevice(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return 'other';
  }

  const ua = userAgent.toLowerCase();

  // 1. Tablet check (iPad, generic tablet, Android tablet without "mobile")
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }

  // 2. Mobile check (iPhone, iPod, Android phone, mobile keyword)
  if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(ua)) {
    return 'mobile';
  }

  // 3. Desktop check (Windows, macOS, Linux desktop, ChromeOS)
  if (/windows nt|macintosh|mac os x|linux(?!.*android)|cros/i.test(ua)) {
    return 'desktop';
  }

  return 'other';
}

/**
 * Normalizes a Referer header string into a clean, canonical domain name, 'internal', or 'direct'.
 * - Lowercases hostname and removes safe 'www.' prefix.
 * - Preserves arbitrary valid subdomains and public suffixes (e.g. blog.example.co.uk).
 * - Classifies same-site canonical-host referrals as 'internal'.
 * - Classifies missing, empty, or malformed referrers as 'direct'.
 *
 * @param {string | null | undefined} refererHeader
 * @param {string | null | undefined} appUrl
 * @returns {string}
 */
export function normalizeReferrer(refererHeader, appUrl) {
  if (!refererHeader || typeof refererHeader !== 'string') {
    return 'direct';
  }

  const raw = refererHeader.trim();
  if (!raw) {
    return 'direct';
  }

  let hostname = '';
  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    hostname = (url.hostname || '').toLowerCase();
  } catch {
    return 'direct';
  }

  // Strip only the safe 'www.' prefix
  hostname = hostname.replace(/^www\./, '');

  if (!hostname) {
    return 'direct';
  }

  // Check for same-site canonical host referrals -> 'internal'
  if (appUrl) {
    try {
      const appHost = new URL(appUrl.includes('://') ? appUrl : `https://${appUrl}`).hostname.replace(/^www\./, '').toLowerCase();
      if (appHost && (hostname === appHost || ((appHost === 'localhost' || appHost === '127.0.0.1') && (hostname === 'localhost' || hostname === '127.0.0.1')))) {
        return 'internal';
      }
    } catch {
      // Ignore invalid appUrl
    }
  }

  // If no appUrl configured but referrer is localhost/127.0.0.1, classify as internal
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'internal';
  }

  return hostname;
}
