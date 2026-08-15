import mongoose from 'mongoose';
import connectToDatabase from './connectToDB.js';
import Subscription, { SUBSCRIPTION_PROVIDERS } from '../models/Subscription.js';

const VALID_PROVIDERS_SET = new Set(SUBSCRIPTION_PROVIDERS);

/**
 * Validates and normalizes an input into a valid Mongoose ObjectId.
 *
 * @param {string | mongoose.Types.ObjectId | null | undefined} val
 * @returns {mongoose.Types.ObjectId | null}
 */
export function normalizeUserId(val) {
  if (!val) return null;
  if (val instanceof mongoose.Types.ObjectId) {
    return val;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^[0-9a-fA-F]{24}$/.test(trimmed) && mongoose.Types.ObjectId.isValid(trimmed)) {
      return new mongoose.Types.ObjectId(trimmed);
    }
  }
  return null;
}

/**
 * Retrieves the subscription record for an authenticated user.
 * Read-only, lean retrieval keyed strictly on User._id.
 *
 * - Accepts string or ObjectId userId.
 * - Returns null for missing or malformed userId without executing a DB query.
 * - Returns null when no subscription document exists for the user.
 * - Propagates database infrastructure errors rather than silently masking them.
 * - Performs NO entitlement computation (keeps persistence decoupled from resolution).
 *
 * @param {string | mongoose.Types.ObjectId | null | undefined} userId
 * @returns {Promise<Object | null>}
 */
export async function getSubscriptionByUserId(userId) {
  const normalizedId = normalizeUserId(userId);
  if (!normalizedId) {
    return null;
  }

  await connectToDatabase();

  const doc = await Subscription.findOne({ userId: normalizedId }).lean();
  return doc || null;
}

/**
 * Retrieves a subscription record by payment provider and external subscription ID.
 * Read-only lookup designed for deterministic webhook handling.
 *
 * - Returns null without querying if provider is invalid or external ID is missing.
 * - Returns null if no matching document exists.
 * - Propagates DB errors.
 *
 * @param {string | null | undefined} provider
 * @param {string | null | undefined} providerSubscriptionId
 * @returns {Promise<Object | null>}
 */
export async function getSubscriptionByProviderId(provider, providerSubscriptionId) {
  if (!provider || typeof provider !== 'string') {
    return null;
  }
  const normalizedProvider = provider.trim().toLowerCase();
  if (!VALID_PROVIDERS_SET.has(normalizedProvider)) {
    return null;
  }

  if (!providerSubscriptionId || typeof providerSubscriptionId !== 'string') {
    return null;
  }
  const cleanSubId = providerSubscriptionId.trim();
  if (!cleanSubId) {
    return null;
  }

  await connectToDatabase();

  const doc = await Subscription.findOne({
    provider: normalizedProvider,
    providerSubscriptionId: cleanSubId,
  }).lean();

  return doc || null;
}
