// Single source of truth for username rules (D-24). Plain module, NOT 'use server' —
// the claim form is a client component and must be able to import it.

// Superset of every real top-level app/ route segment plus a curated admin-ish set (D-23).
// ponytail: adding a new top-level app/ route later means adding it here too. A route that
// collides with an already-claimed username is unrecoverable — the user owns the URL.
export const RESERVED_USERNAMES = new Set([
  // real route segments, enumerated from disk
  'api', 'account', 'analytics', 'about', 'login',
  // curated admin-ish set
  'admin', 'administrator', 'root', 'superuser', 'support', 'help', 'contact',
  'settings', 'config', 'privacy', 'terms', 'legal', 'security', 'billing',
  'signup', 'signin', 'signout', 'logout', 'register', 'auth', 'oauth',
  'dashboard', 'profile', 'user', 'users', 'me', 'static', 'public', 'assets',
  'favicon', 'robots', 'sitemap', 'null', 'undefined', 'true', 'false',
  'test', 'new', 'edit', 'delete',
  // No profanity list (D-23): always incomplete, and abuse reporting is a v2 requirement.
]);

/**
 * Validates an already-lowercased username. Does NOT lowercase its input —
 * callers lowercase first (grabusername.js:11), so uppercase here is a charset failure.
 * @returns {{ok: true}|{ok: false, error: string}}
 */
export function validateUsername(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    return { ok: false, error: 'Username is required' };
  }
  if (name.length < 3 || name.length > 30) {
    return { ok: false, error: 'Username must be 3-30 characters' };
  }
  if (!/^[a-z0-9_-]+$/.test(name)) {
    return {
      ok: false,
      error: 'Username can only contain lowercase letters, numbers, hyphens and underscores',
    };
  }
  if (RESERVED_USERNAMES.has(name)) {
    return { ok: false, error: 'That username is reserved' };
  }
  return { ok: true };
}
