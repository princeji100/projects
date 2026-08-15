import mongoose from 'mongoose';

const { model, models, Schema } = mongoose;

export const WEBHOOK_PROVIDERS = Object.freeze(['razorpay']);
export const WEBHOOK_PROCESSING_STATUSES = Object.freeze([
  'received',
  'ignored',
  'processed',
  'failed',
]);

/**
 * Billing Webhook Event Model (Wave 11A)
 *
 * Stores immutable ledger records of incoming billing provider webhook events for
 * idempotent ingestion and subsequent asynchronous lifecycle processing.
 *
 * Invariants:
 * - Unique compound index on { provider: 1, eventId: 1 } prevents duplicate delivery side effects.
 * - Stores ONLY essential metadata (providerSubscriptionId, timestamps, status).
 * - NEVER stores full raw webhook payloads, card/bank numbers, API secrets, or customer credentials.
 */
const BillingWebhookEventSchema = new Schema(
  {
    provider: {
      type: String,
      enum: WEBHOOK_PROVIDERS,
      required: true,
      default: 'razorpay',
    },
    eventId: {
      type: String,
      required: true,
      trim: true,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
    },
    providerSubscriptionId: {
      type: String,
      trim: true,
    },
    providerCreatedAt: {
      type: Date,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    processedAt: {
      type: Date,
    },
    processingStatus: {
      type: String,
      enum: WEBHOOK_PROCESSING_STATUSES,
      default: 'received',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique event idempotency per provider
BillingWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
BillingWebhookEventSchema.index({ providerSubscriptionId: 1 }, { sparse: true });

export default models?.BillingWebhookEvent || model('BillingWebhookEvent', BillingWebhookEventSchema);
