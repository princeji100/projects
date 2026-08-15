/**
 * Page Owner Identity Resolver
 * Transitional bridge between legacy Page.owner email and immutable User._id billing authority.
 * 
 * Server-only module.
 */

import connectToDatabase from './connectToDB.js';
import User from '../models/User.js';

/**
 * Resolves the immutable User._id for a creator Page.
 * 
 * Invariants:
 * - Returns User._id when owner matches an existing User document.
 * - Returns null when page is missing, owner email is empty, or User is not found.
 * - Never returns full User documents or exposes emails to client bundles.
 * - Supports dependency injection for testing via options.findUser.
 *
 * @param {Object | string | null | undefined} pageOrOwner - Page document or owner email string
 * @param {Object} [options]
 * @param {Function} [options.findUser] - Mock user finder for testing
 * @returns {Promise<Object | string | null>}
 */
export async function getPageOwnerUserId(pageOrOwner, options = {}) {
  if (!pageOrOwner) {
    return null;
  }

  let ownerEmail = '';
  if (typeof pageOrOwner === 'string') {
    ownerEmail = pageOrOwner.trim().toLowerCase();
  } else if (typeof pageOrOwner === 'object' && typeof pageOrOwner.owner === 'string') {
    ownerEmail = pageOrOwner.owner.trim().toLowerCase();
  }

  if (!ownerEmail) {
    return null;
  }

  const finder = typeof options.findUser === 'function'
    ? options.findUser
    : async (email) => {
        await connectToDatabase();
        return User.findOne({ email }).select('_id').lean();
      };

  const userDoc = await finder(ownerEmail);
  return userDoc?._id || null;
}
