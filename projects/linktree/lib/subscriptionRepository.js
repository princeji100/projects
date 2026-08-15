import mongoose from 'mongoose';
import connectToDatabase from './connectToDB.js';
import Subscription, { SUBSCRIPTION_PROVIDERS } from '../models/Subscription.js';
import User from '../models/User.js';

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

/**
 * Grants Pro access manually to a user account.
 * Privileged administrative mutation for internal testing / manual grants.
 * 
 * Invariants:
 * - Operates strictly on User._id.
 * - Verifies that target User exists.
 * - Sets plan: 'pro', status: 'active', provider: 'manual', cancelAtPeriodEnd: false.
 * - Clears any provider customer/subscription IDs and expiration dates.
 * - Refuses to overwrite non-manual (e.g. Stripe/Razorpay) subscriptions with SUBSCRIPTION_PROVIDER_MANAGED.
 * - Idempotent across repeated executions.
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @param {Object} [options]
 * @param {Function} [options.findUser] - Optional mock user finder for testing
 * @param {Function} [options.findSubscription] - Optional mock subscription finder
 * @param {Function} [options.saveSubscription] - Optional mock subscription saver
 * @returns {Promise<{ success: boolean, effectivePlan: 'pro' }>}
 */
export async function grantManualProByUserId(userId, options = {}) {
  const normalizedId = normalizeUserId(userId);
  if (!normalizedId) {
    const err = new Error('Invalid user ID provided');
    err.code = 'INVALID_USER_ID';
    throw err;
  }

  await connectToDatabase();

  // 1. Verify that target User exists
  const userFinder = typeof options.findUser === 'function'
    ? options.findUser
    : async (id) => User.findById(id).lean();

  const existingUser = await userFinder(normalizedId);
  if (!existingUser) {
    const err = new Error('Target user does not exist');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  // 2. Inspect existing subscription for provider protection
  const subFinder = typeof options.findSubscription === 'function'
    ? options.findSubscription
    : async (id) => Subscription.findOne({ userId: id }).lean();

  const existingSub = await subFinder(normalizedId);
  if (existingSub && existingSub.provider && existingSub.provider !== 'manual') {
    const err = new Error('Cannot manually overwrite a subscription managed by an external billing provider');
    err.code = 'SUBSCRIPTION_PROVIDER_MANAGED';
    throw err;
  }

  // 3. Perform idempotent normalized manual grant
  const updateData = {
    $set: {
      plan: 'pro',
      status: 'active',
      provider: 'manual',
      cancelAtPeriodEnd: false,
    },
    $unset: {
      providerCustomerId: '',
      providerSubscriptionId: '',
      currentPeriodStart: '',
      currentPeriodEnd: '',
    },
  };

  const saver = typeof options.saveSubscription === 'function'
    ? options.saveSubscription
    : async (id, update) => Subscription.findOneAndUpdate(
        { userId: id },
        update,
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean();

  await saver(normalizedId, updateData);

  return { success: true, effectivePlan: 'pro' };
}

/**
 * Revokes a manual Pro grant, returning the account to a clean manual Free state.
 * 
 * Invariants:
 * - Operates strictly on User._id.
 * - If no subscription exists, completes idempotently.
 * - Refuses to alter non-manual provider subscriptions.
 * - Sets plan: 'free', status: 'active', provider: 'manual'.
 * - Preserves creator Page and link data completely.
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @param {Object} [options]
 * @param {Function} [options.findSubscription]
 * @param {Function} [options.saveSubscription]
 * @returns {Promise<{ success: boolean, effectivePlan: 'free' }>}
 */
export async function revokeManualProByUserId(userId, options = {}) {
  const normalizedId = normalizeUserId(userId);
  if (!normalizedId) {
    const err = new Error('Invalid user ID provided');
    err.code = 'INVALID_USER_ID';
    throw err;
  }

  await connectToDatabase();

  // 1. Inspect existing subscription
  const subFinder = typeof options.findSubscription === 'function'
    ? options.findSubscription
    : async (id) => Subscription.findOne({ userId: id }).lean();

  const existingSub = await subFinder(normalizedId);
  if (!existingSub) {
    return { success: true, effectivePlan: 'free' };
  }

  if (existingSub.provider && existingSub.provider !== 'manual') {
    const err = new Error('Cannot manually revoke a subscription managed by an external billing provider');
    err.code = 'SUBSCRIPTION_PROVIDER_MANAGED';
    throw err;
  }

  // 2. Perform clean manual revoke
  const updateData = {
    $set: {
      plan: 'free',
      status: 'active',
      provider: 'manual',
      cancelAtPeriodEnd: false,
    },
    $unset: {
      providerCustomerId: '',
      providerSubscriptionId: '',
      currentPeriodStart: '',
      currentPeriodEnd: '',
    },
  };

  const saver = typeof options.saveSubscription === 'function'
    ? options.saveSubscription
    : async (id, update) => Subscription.findOneAndUpdate(
        { userId: id },
        update,
        { new: true, runValidators: true }
      ).lean();

  await saver(normalizedId, updateData);

  return { success: true, effectivePlan: 'free' };
}

/**
 * Persists a pending Razorpay subscription for an authenticated user.
 * Sets status: 'incomplete', provider: 'razorpay', plan: 'pro'.
 * 
 * Invariants:
 * - Operates strictly on User._id.
 * - Validates providerSubscriptionId format (sub_...).
 * - Verifies that target User exists.
 * - Does NOT grant Pro entitlements (status remains incomplete).
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @param {string} providerSubscriptionId
 * @param {Object} [options]
 * @param {Function} [options.findUser]
 * @param {Function} [options.saveSubscription]
 * @returns {Promise<Object>} Lean persisted subscription document
 */
export async function saveRazorpayPendingSubscriptionByUserId(
  userId,
  providerSubscriptionId,
  options = {}
) {
  const normalizedId = normalizeUserId(userId);
  if (!normalizedId) {
    const err = new Error('Invalid user ID provided');
    err.code = 'INVALID_USER_ID';
    throw err;
  }

  if (
    !providerSubscriptionId ||
    typeof providerSubscriptionId !== 'string' ||
    !providerSubscriptionId.trim().startsWith('sub_')
  ) {
    const err = new Error('Invalid Razorpay subscription ID format');
    err.code = 'INVALID_PROVIDER_SUBSCRIPTION_ID';
    throw err;
  }

  await connectToDatabase();

  // 1. Verify user exists
  const userFinder = typeof options.findUser === 'function'
    ? options.findUser
    : async (id) => User.findById(id).lean();

  const existingUser = await userFinder(normalizedId);
  if (!existingUser) {
    const err = new Error('Target user does not exist');
    err.code = 'USER_NOT_FOUND';
    throw err;
  }

  // 2. Persist normalized pending Razorpay state
  const cleanSubId = providerSubscriptionId.trim();
  const updateData = {
    $set: {
      plan: 'pro',
      status: 'incomplete',
      provider: 'razorpay',
      providerSubscriptionId: cleanSubId,
      cancelAtPeriodEnd: false,
    },
    $unset: {
      providerCustomerId: '',
      currentPeriodStart: '',
      currentPeriodEnd: '',
    },
  };

  const saver = typeof options.saveSubscription === 'function'
    ? options.saveSubscription
    : async (id, update) => Subscription.findOneAndUpdate(
        { userId: id },
        update,
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      ).lean();

  const savedDoc = await saver(normalizedId, updateData);
  return savedDoc;
}

/**
 * Records that a Razorpay checkout authorization/mandate signature was successfully verified server-side.
 *
 * Invariants:
 * - Keyed strictly on User._id.
 * - Does NOT grant Pro (status remains 'incomplete').
 * - Sets providerAuthorizationVerifiedAt = now.
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @param {Object} [options]
 * @returns {Promise<Object | null>}
 */
export async function markRazorpayAuthorizationVerified(userId, options = {}) {
  const normalizedId = normalizeUserId(userId);
  if (!normalizedId) {
    const err = new Error('Invalid user ID provided');
    err.code = 'INVALID_USER_ID';
    throw err;
  }

  await connectToDatabase();

  const saver = typeof options.saveSubscription === 'function'
    ? options.saveSubscription
    : async (id, update) => Subscription.findOneAndUpdate(
        { userId: id, provider: 'razorpay' },
        update,
        { new: true, runValidators: true }
      ).lean();

  const updated = await saver(normalizedId, {
    $set: {
      providerAuthorizationVerifiedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Applies a normalized Razorpay lifecycle event atomically to the local subscription.
 *
 * Invariants:
 * - Looks up subscription exclusively via provider='razorpay' and providerSubscriptionId.
 * - Rejects unknown providerSubscriptionId without mutating or creating a subscription.
 * - Validates provider plan_id against expected Pro plan ID.
 * - Protects against stale/out-of-order events using providerStateUpdatedAt.
 * - Protects terminal states (canceled/expired) against accidental revival from stale events.
 * - Never alters userId, provider, or providerSubscriptionId.
 * - Propagates database errors.
 *
 * @param {string} providerSubscriptionId
 * @param {Object} normalizedLifecycle - From normalizeRazorpayLifecycleEvent
 * @param {Object} [options]
 * @param {string} [options.expectedPlanId]
 * @param {Function} [options.findSubscription]
 * @param {Function} [options.saveSubscription]
 * @returns {Promise<{ success: boolean, reason?: string, ignored?: boolean, subscription?: Object }>}
 */
export async function applyRazorpayLifecycleState(
  providerSubscriptionId,
  normalizedLifecycle,
  options = {}
) {
  if (!providerSubscriptionId || typeof providerSubscriptionId !== 'string') {
    return { success: false, reason: 'INVALID_PROVIDER_SUBSCRIPTION_ID', ignored: true };
  }

  if (!normalizedLifecycle || typeof normalizedLifecycle !== 'object' || !normalizedLifecycle.isValid) {
    return { success: false, reason: 'INVALID_NORMALIZED_LIFECYCLE', ignored: true };
  }

  await connectToDatabase();

  const finder = typeof options.findSubscription === 'function'
    ? options.findSubscription
    : async (subId) => Subscription.findOne({ provider: 'razorpay', providerSubscriptionId: subId }).lean();

  const existing = await finder(providerSubscriptionId.trim());
  if (!existing) {
    return { success: false, reason: 'LOCAL_SUBSCRIPTION_NOT_FOUND', ignored: true };
  }

  // 1. Plan ID validation
  const expectedPlanId = options.expectedPlanId || process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID?.trim();
  if (expectedPlanId && normalizedLifecycle.planId && normalizedLifecycle.planId !== expectedPlanId) {
    return { success: false, reason: 'PLAN_MISMATCH', ignored: true };
  }

  // 2. Out-of-order / Stale event protection
  if (existing.providerStateUpdatedAt && normalizedLifecycle.providerStateUpdatedAt) {
    const existingTime = new Date(existing.providerStateUpdatedAt).getTime();
    const incomingTime = new Date(normalizedLifecycle.providerStateUpdatedAt).getTime();
    if (!isNaN(existingTime) && !isNaN(incomingTime) && incomingTime < existingTime) {
      return { success: false, reason: 'STALE_EVENT', ignored: true };
    }
  }

  // 3. Terminal state protection: canceled and expired states cannot be revived by active/charged events
  if (existing.status === 'canceled' || existing.status === 'expired') {
    if (normalizedLifecycle.status === 'active') {
      const existingTime = existing.providerStateUpdatedAt ? new Date(existing.providerStateUpdatedAt).getTime() : 0;
      const incomingTime = normalizedLifecycle.providerStateUpdatedAt ? new Date(normalizedLifecycle.providerStateUpdatedAt).getTime() : 0;
      if (incomingTime <= existingTime) {
        return { success: false, reason: 'TERMINAL_STATE_PROTECTED', ignored: true };
      }
    }
  }

  // 4. Build atomic update document
  const updateFields = {};

  if (normalizedLifecycle.status !== undefined) {
    updateFields.status = normalizedLifecycle.status;
  }
  if (normalizedLifecycle.providerCustomerId) {
    updateFields.providerCustomerId = normalizedLifecycle.providerCustomerId;
  }
  if (normalizedLifecycle.currentPeriodStart) {
    updateFields.currentPeriodStart = normalizedLifecycle.currentPeriodStart;
  }
  if (normalizedLifecycle.currentPeriodEnd) {
    updateFields.currentPeriodEnd = normalizedLifecycle.currentPeriodEnd;
  }
  if (normalizedLifecycle.providerStateUpdatedAt) {
    updateFields.providerStateUpdatedAt = normalizedLifecycle.providerStateUpdatedAt;
  }

  if (Object.keys(updateFields).length === 0) {
    return { success: true, subscription: existing, noop: true };
  }

  const saver = typeof options.saveSubscription === 'function'
    ? options.saveSubscription
    : async (id, update) => Subscription.findOneAndUpdate(
        { _id: id },
        { $set: update },
        { new: true, runValidators: true }
      ).lean();

  const updatedDoc = await saver(existing._id, updateFields);
  return { success: true, subscription: updatedDoc };
}

