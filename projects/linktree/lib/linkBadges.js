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
    badgeClass: '',
    pillClass: 'border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100',
  },
  {
    id: 'hot',
    label: 'Hot',
    displayText: 'HOT',
    emoji: '🔥',
    description: 'Highlights high-engagement or trending links',
    badgeClass: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
    pillClass: 'border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100',
  },
  {
    id: 'new',
    label: 'New',
    displayText: 'NEW',
    emoji: '✨',
    description: 'Indicates recently added content or updates',
    badgeClass: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
    pillClass: 'border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100',
  },
  {
    id: 'pinned',
    label: 'Pinned',
    displayText: 'PINNED',
    emoji: '⭐',
    description: 'Visual badge highlighting key links (no sort reordering)',
    badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    pillClass: 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100',
  },
  {
    id: 'offer',
    label: 'Offer',
    displayText: 'OFFER',
    emoji: '🎁',
    description: 'Draws attention to deals, discounts, or promotions',
    badgeClass: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
    pillClass: 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100',
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
