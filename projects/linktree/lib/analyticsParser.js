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
 * Normalizes a Referer header string into a clean, canonical domain name or 'direct'.
 * Strips protocol, path, port, query params, fragments, credentials, and 'www.' prefixes.
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

  // Strip leading 'www.'
  hostname = hostname.replace(/^www\./, '');

  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'direct';
  }

  // Same-origin check
  if (appUrl) {
    try {
      const appOrigin = new URL(appUrl.includes('://') ? appUrl : `https://${appUrl}`).hostname.replace(/^www\./, '').toLowerCase();
      if (hostname === appOrigin) {
        return 'direct';
      }
    } catch {
      // Ignore invalid appUrl
    }
  }

  // Map common redirect/mobile subdomains to canonical brand hostnames
  if (hostname === 't.co') return 'twitter.com';
  if (/^(l|lm)\.instagram\.com$/.test(hostname)) return 'instagram.com';
  if (/^(l|lm|m)\.facebook\.com$/.test(hostname)) return 'facebook.com';
  if (hostname === 'youtu.be' || hostname === 'm.youtube.com') return 'youtube.com';
  if (hostname === 'lnkd.in') return 'linkedin.com';
  if (hostname === 'm.reddit.com' || hostname === 'out.reddit.com') return 'reddit.com';

  return hostname;
}
