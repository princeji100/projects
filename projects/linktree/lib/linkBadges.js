/**
 * Link Badge Registry and Validation Engine
 * Provides stable badge identifiers, display metadata, and normalization for link badges.
 */

export const LINK_BADGES = [
  {
    id: 'none',
    label: 'None',
    displayText: '',
    emoji: '',
    description: 'No visual badge displayed',
  },
  {
    id: 'hot',
    label: 'Hot',
    displayText: 'HOT',
    emoji: '🔥',
    description: 'Highlights high-engagement or trending links',
  },
  {
    id: 'new',
    label: 'New',
    displayText: 'NEW',
    emoji: '✨',
    description: 'Indicates recently added content or updates',
  },
  {
    id: 'pinned',
    label: 'Pinned',
    displayText: 'PINNED',
    emoji: '⭐',
    description: 'Visual badge highlighting key links (no sort reordering)',
  },
  {
    id: 'offer',
    label: 'Offer',
    displayText: 'OFFER',
    emoji: '🎁',
    description: 'Draws attention to deals, discounts, or promotions',
  },
];

export const VALID_BADGE_IDS = new Set(LINK_BADGES.map((b) => b.id));

/**
 * Normalizes and validates a badge string.
 * Missing/null/empty values return { ok: true, badge: 'none' }.
 * Unrecognized values return { ok: false, error: '...' }.
 *
 * @param {string | null | undefined} val
 * @returns {{ ok: boolean, badge: string, error?: string }}
 */
export function normalizeLinkBadge(val) {
  if (val === undefined || val === null || val === '') {
    return { ok: true, badge: 'none' };
  }
  if (typeof val !== 'string') {
    return { ok: false, badge: 'none', error: 'Badge must be a string' };
  }
  const normalized = val.trim().toLowerCase();
  if (normalized === '') {
    return { ok: true, badge: 'none' };
  }
  if (VALID_BADGE_IDS.has(normalized)) {
    return { ok: true, badge: normalized };
  }
  return { ok: false, badge: 'none', error: `Invalid badge selection "${val}"` };
}

/**
 * Resolves a badge metadata item by ID safely, falling back to 'none' on missing or invalid keys.
 *
 * @param {string | null | undefined} id
 * @returns {typeof LINK_BADGES[0]}
 */
export function getLinkBadge(id) {
  if (!id || typeof id !== 'string') {
    return LINK_BADGES[0];
  }
  const normalized = id.trim().toLowerCase();
  const match = LINK_BADGES.find((b) => b.id === normalized);
  return match || LINK_BADGES[0];
}
