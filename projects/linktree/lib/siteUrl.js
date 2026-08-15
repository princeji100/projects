/**
 * Centralized Site / Canonical Profile URL Configuration & Abstraction
 * 
 * Provides pure, deterministic URL resolution for platform handles and
 * future verified custom domains.
 */

/**
 * Returns the configured base origin URL for the platform without trailing slashes.
 * Returns empty string if the environment variable is not configured.
 *
 * @returns {string}
 */
export function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXTAUTH_URL;
  if (!envUrl || typeof envUrl !== 'string' || !envUrl.trim()) {
    return '';
  }
  return envUrl.trim().replace(/\/+$/, '');
}

/**
 * Validates and normalizes a candidate hostname for custom domain formatting.
 *
 * @param {string | null | undefined} hostname
 * @returns {{ ok: boolean, hostname?: string, error?: string }}
 */
export function normalizeHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return { ok: false, error: 'Hostname must be a non-empty string' };
  }
  let trimmed = hostname.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false, error: 'Hostname cannot be empty' };
  }

  // Reject embedded scheme
  if (trimmed.includes('://') || trimmed.startsWith('//')) {
    return { ok: false, error: 'Hostname cannot contain a URL scheme' };
  }

  // Reject user credentials
  if (trimmed.includes('@')) {
    return { ok: false, error: 'Hostname cannot contain user credentials' };
  }

  // Reject path, query string, or fragment
  if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('?') || trimmed.includes('#')) {
    return { ok: false, error: 'Hostname cannot contain paths, query parameters, or fragments' };
  }

  // Reject port specification
  if (trimmed.includes(':')) {
    return { ok: false, error: 'Hostname cannot contain a port specification' };
  }

  // Strip single harmless trailing dot (FQDN representation)
  if (trimmed.endsWith('.')) {
    trimmed = trimmed.slice(0, -1);
  }
  if (!trimmed) {
    return { ok: false, error: 'Invalid hostname after stripping trailing dot' };
  }

  // Validate domain labels (RFC 1123 format)
  const labels = trimmed.split('.');
  if (labels.length < 2) {
    return { ok: false, error: 'Hostname must contain at least two domain labels' };
  }

  const labelRegex = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  for (const label of labels) {
    if (!label || !labelRegex.test(label)) {
      return { ok: false, error: `Invalid domain label "${label}"` };
    }
  }

  return { ok: true, hostname: trimmed };
}

/**
 * Constructs the standard platform profile URL for a given username/uri.
 * E.g. https://linktree.example.com/alex
 *
 * @param {string | null | undefined} uri
 * @returns {string}
 */
export function getPlatformProfileUrl(uri) {
  if (!uri || typeof uri !== 'string') return '';
  const cleanUri = uri.trim().replace(/^\/+|\/+$/g, '');
  if (!cleanUri) return '';
  const baseUrl = getBaseUrl();
  if (!baseUrl) return '';
  return `${baseUrl}/${cleanUri}`;
}

/**
 * Backward-compatible alias for getPlatformProfileUrl.
 *
 * @param {string | null | undefined} uri
 * @returns {string}
 */
export function getPublicProfileUrl(uri) {
  return getPlatformProfileUrl(uri);
}

/**
 * Constructs the canonical public profile URL for a page/profile.
 * 
 * Rules:
 * - If a trusted verified primary custom domain is provided: returns https://creator-domain.example/ (root path)
 * - Otherwise: fails closed to standard platform URL (https://platform.example/alex)
 *
 * @param {Object | string | null | undefined} pageOrProfile - Page document, object with { uri }, or raw uri string
 * @param {Object} [options]
 * @param {Object | null | undefined} [options.verifiedPrimaryDomain] - Trusted verified domain record from server
 * @returns {string}
 */
export function getCanonicalProfileUrl(pageOrProfile, options = {}) {
  if (!pageOrProfile) return '';

  const uri = typeof pageOrProfile === 'string'
    ? pageOrProfile
    : (typeof pageOrProfile === 'object' ? pageOrProfile.uri : '');

  const candidateDomain = options?.verifiedPrimaryDomain || (typeof pageOrProfile === 'object' ? pageOrProfile.verifiedPrimaryDomain : null);

  // Check trusted domain contract: must be an object with status 'verified', isPrimary === true, and valid hostname
  if (
    candidateDomain &&
    typeof candidateDomain === 'object' &&
    !Array.isArray(candidateDomain) &&
    candidateDomain.status === 'verified' &&
    candidateDomain.isPrimary === true &&
    typeof candidateDomain.hostname === 'string'
  ) {
    const norm = normalizeHostname(candidateDomain.hostname);
    if (norm.ok && norm.hostname) {
      // Root custom domain path: https://domain/ (do NOT append /{uri})
      return `https://${norm.hostname}/`;
    }
  }

  // Fails closed to platform profile URL
  return getPlatformProfileUrl(uri);
}
