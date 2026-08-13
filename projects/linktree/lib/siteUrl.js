/**
 * Centralized Site / Canonical Base URL Configuration
 */

export function getBaseUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  return envUrl.replace(/\/+$/, '');
}

/**
 * Constructs the canonical public profile URL for a given username/uri.
 *
 * @param {string | null | undefined} uri
 * @returns {string}
 */
export function getPublicProfileUrl(uri) {
  if (!uri || typeof uri !== 'string') return '';
  const cleanUri = uri.trim().replace(/^\/+|\/+$/g, '');
  if (!cleanUri) return '';
  const baseUrl = getBaseUrl();
  return `${baseUrl}/${cleanUri}`;
}
