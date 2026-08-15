/**
 * Profile Identity Helper
 * Defines pure helpers for resolving stable profile identity.
 * 
 * Architectural Contract:
 * - User._id: Account / billing identity
 * - Page._id: Permanent profile identity
 * - Page.uri: Mutable platform handle / alias
 * - Future Domain.pageId -> Page._id
 */

/**
 * Extracts the stable immutable Page ID from a page document or object.
 *
 * @param {Object | null | undefined} page
 * @returns {string | null}
 */
export function getStablePageId(page) {
  if (!page || typeof page !== 'object') return null;
  const id = page._id || page.id;
  if (!id) return null;
  if (typeof id === 'string') {
    const trimmed = id.trim();
    return trimmed || null;
  }
  if (typeof id.toString === 'function') {
    const str = id.toString().trim();
    return str || null;
  }
  return null;
}
