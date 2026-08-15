import mongoose from 'mongoose';
import { PLAN_IDS } from '../lib/plans.js';

const { model, models, Schema } = mongoose;

export const SUBSCRIPTION_STATUSES = Object.freeze([
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
  'expired',
  'paused',
]);

export const SUBSCRIPTION_PROVIDERS = Object.freeze([
  'manual',
  'razorpay',
  'stripe',
]);

/**
 * Subscription Data Model
 * Manages account-level SaaS subscription records.
 *
 * Billing ownership is strictly keyed on User._id (never email, URI, Page._id, or hostname).
 * Default status is 'incomplete' (fail-closed security).
 */
const SubscriptionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
    immutable: true,
  },
  plan: {
    type: String,
    enum: Object.values(PLAN_IDS),
    default: PLAN_IDS.FREE,
    required: true,
  },
  status: {
    type: String,
    enum: SUBSCRIPTION_STATUSES,
    default: 'incomplete',
    required: true,
  },
  provider: {
    type: String,
    enum: SUBSCRIPTION_PROVIDERS,
    default: 'manual',
    required: true,
  },
  providerCustomerId: {
    type: String,
    default: undefined,
  },
  providerSubscriptionId: {
    type: String,
    default: undefined,
  },
  providerStateUpdatedAt: {
    type: Date,
    default: undefined,
  },
  providerAuthorizationVerifiedAt: {
    type: Date,
    default: undefined,
  },
  currentPeriodStart: {
    type: Date,
    default: undefined,
  },
  currentPeriodEnd: {
    type: Date,
    default: undefined,
  },
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Partial unique compound index: enables deterministic external subscription lookup
// while allowing multiple manual subscriptions with undefined providerSubscriptionId.
SubscriptionSchema.index(
  { provider: 1, providerSubscriptionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      providerSubscriptionId: { $type: 'string' },
    },
  }
);

// Fix model initialization to handle Next.js hot reloading
export default models?.Subscription || model('Subscription', SubscriptionSchema);
