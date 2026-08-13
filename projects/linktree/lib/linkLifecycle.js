/**
 * Link Lifecycle Evaluator and Validator
 * Single source of truth for link status, visibility, and schedule validation.
 */

/**
 * Calculates the current lifecycle status for a link.
 * Precedence:
 * 1. link.active === false -> 'inactive'
 * 2. startsAt > now -> 'scheduled'
 * 3. endsAt <= now -> 'expired'
 * 4. otherwise -> 'live'
 *
 * @param {Object} link
 * @param {Date} [now=new Date()]
 * @returns {'inactive' | 'scheduled' | 'expired' | 'live'}
 */
export function getLinkLifecycleStatus(link, now = new Date()) {
  if (!link) return 'inactive';

  // 1. Inactive check (missing active defaults to true)
  if (link.active === false) {
    return 'inactive';
  }

  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  // 2. Scheduled start check
  if (link.startsAt) {
    const startDate = new Date(link.startsAt);
    if (!isNaN(startDate.getTime()) && startDate.getTime() > currentTime) {
      return 'scheduled';
    }
  }

  // 3. Expiration check
  if (link.endsAt) {
    const endDate = new Date(link.endsAt);
    if (!isNaN(endDate.getTime()) && currentTime >= endDate.getTime()) {
      return 'expired';
    }
  }

  // 4. Live
  return 'live';
}

/**
 * Checks if a link is currently visible on the public page.
 *
 * @param {Object} link
 * @param {Date} [now=new Date()]
 * @returns {boolean}
 */
export function isLinkLive(link, now = new Date()) {
  return getLinkLifecycleStatus(link, now) === 'live';
}

/**
 * Validates and sanitizes link schedule and active status before saving to MongoDB.
 *
 * @param {Object} link
 * @returns {{ ok: boolean, error?: string, link?: Object }}
 */
export function validateAndSanitizeLink(link) {
  if (!link || typeof link !== 'object') {
    return { ok: false, error: 'Link payload must be an object' };
  }

  const active = link.active !== false;
  let startsAt = null;
  let endsAt = null;

  if (link.startsAt) {
    const parsedStart = new Date(link.startsAt);
    if (isNaN(parsedStart.getTime())) {
      return { ok: false, error: 'Invalid start date format' };
    }
    startsAt = parsedStart;
  }

  if (link.endsAt) {
    const parsedEnd = new Date(link.endsAt);
    if (isNaN(parsedEnd.getTime())) {
      return { ok: false, error: 'Invalid expiration date format' };
    }
    endsAt = parsedEnd;
  }

  if (startsAt && endsAt) {
    if (endsAt.getTime() <= startsAt.getTime()) {
      return { ok: false, error: 'Link expiration time must be after start time' };
    }
  }

  const sanitized = {
    ...link,
    active,
    startsAt,
    endsAt,
  };

  return { ok: true, link: sanitized };
}

/**
 * Formats a Date object or ISO timestamp string into a local 'YYYY-MM-DDTHH:mm' input value.
 *
 * @param {Date | string | null | undefined} dateVal
 * @returns {string}
 */
export function toLocalDatetimeInput(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

/**
 * Converts a local 'YYYY-MM-DDTHH:mm' input string to a UTC Date object.
 * Empty or whitespace strings return null (indicating no schedule constraint).
 *
 * @param {string | null | undefined} val
 * @returns {Date | null}
 */
export function fromLocalDatetimeInput(val) {
  if (!val || typeof val !== 'string' || !val.trim()) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
