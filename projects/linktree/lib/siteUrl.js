/**
 * Centralized Site / Canonical Base URL Configuration
 */

export function getBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_URL || process.env.NEXTAUTH_URL;
  if (!envUrl || typeof envUrl !== 'string' || !envUrl.trim()) {
    return '';
  }
  return envUrl.trim().replace(/\/+$/, '');
}

/**
 * Constructs the canonical public profile URL for a given username/uri.
 * Returns an empty string if uri is invalid OR if the canonical base URL environment variable is not configured,
 * preventing silent emission of invalid or localhost URLs in production.
 *
 * @param {string | null | undefined} uri
 * @returns {string}
 */
export function getPublicProfileUrl(uri) {
  if (!uri || typeof uri !== 'string') return '';
  const cleanUri = uri.trim().replace(/^\/+|\/+$/g, '');
  if (!cleanUri) return '';
  const baseUrl = getBaseUrl();
  if (!baseUrl) return '';
  return `${baseUrl}/${cleanUri}`;
}
