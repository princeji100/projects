import connectToDatabase from '../../../../../lib/connectToDB.js';
import BillingWebhookEvent from '../../../../../models/BillingWebhookEvent.js';
import {
  verifyRazorpayWebhookSignature,
  isSupportedRazorpaySubscriptionEvent,
  extractWebhookSubscriptionMetadata,
} from '../../../../../lib/billing/webhook.js';
import { normalizeRazorpayLifecycleEvent } from '../../../../../lib/billing/providers/razorpayLifecycle.js';
import { applyRazorpayLifecycleState } from '../../../../../lib/subscriptionRepository.js';

/**
 * Public Razorpay Webhook Ingestion & Lifecycle Endpoint (Wave 11B)
 *
 * Endpoint: POST /api/billing/razorpay/webhook
 *
 * Invariants:
 * - Public route: authenticates exclusively through x-razorpay-signature (no NextAuth).
 * - Reads raw request body text BEFORE parsing JSON for signature verification.
 * - Enforces event idempotency via unique index on BillingWebhookEvent (provider + eventId).
 * - Safely returns 200 on duplicate delivery without re-processing.
 * - Correlates strictly via providerSubscriptionId to atomic local Subscription records.
 * - Normalizes provider lifecycle events to canonical local Subscription status.
 */
export async function POST(request) {
  // 1. Validate signature header presence
  const signature = request.headers.get('x-razorpay-signature');
  if (!signature) {
    return Response.json(
      { error: 'MISSING_SIGNATURE', message: 'Missing x-razorpay-signature header' },
      { status: 400 }
    );
  }

  // 2. Read raw request body as text BEFORE JSON parsing
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return Response.json(
      { error: 'READ_BODY_FAILED', message: 'Could not read request body' },
      { status: 400 }
    );
  }

  if (!rawBody || !rawBody.trim()) {
    return Response.json(
      { error: 'EMPTY_BODY', message: 'Request body cannot be empty' },
      { status: 400 }
    );
  }

  // 3. Cryptographically verify signature using raw body and webhook secret
  const isValidSignature = verifyRazorpayWebhookSignature({
    rawBody,
    signature,
  });

  if (!isValidSignature) {
    return Response.json(
      { error: 'INVALID_SIGNATURE', message: 'Webhook signature verification failed' },
      { status: 401 }
    );
  }

  // 4. Parse JSON only AFTER signature verification
  let parsedPayload;
  try {
    parsedPayload = JSON.parse(rawBody);
  } catch {
    return Response.json(
      { error: 'MALFORMED_JSON', message: 'Invalid JSON payload structure' },
      { status: 400 }
    );
  }

  // 5. Extract event ID and metadata strictly from header authority
  const eventId = (request.headers.get('x-razorpay-event-id') || '').trim();
  const metadata = extractWebhookSubscriptionMetadata(parsedPayload);
  const eventType = metadata.eventType || (parsedPayload?.event || '').trim();
  const isSupported = isSupportedRazorpaySubscriptionEvent(eventType);

  // For supported subscription events, x-razorpay-event-id header is strictly required
  if (isSupported && !eventId) {
    return Response.json(
      { error: 'MISSING_EVENT_ID', message: 'Missing required x-razorpay-event-id header' },
      { status: 400 }
    );
  }

  // For unsupported events without an event ID, safely ignore without ledger writes
  if (!isSupported && !eventId) {
    return Response.json(
      { received: true, status: 'ignored', eventType },
      { status: 200 }
    );
  }

  // 6. Connect to database
  await connectToDatabase();

  // 7. Persist webhook event record idempotently in ledger
  try {
    await BillingWebhookEvent.create({
      provider: 'razorpay',
      eventId,
      eventType: eventType || 'unknown',
      providerSubscriptionId: metadata.providerSubscriptionId || undefined,
      providerCreatedAt: metadata.providerCreatedAt || undefined,
      receivedAt: new Date(),
      processingStatus: isSupported ? 'received' : 'ignored',
    });
  } catch (err) {
    // Duplicate event delivery (MongoDB duplicate key error code 11000)
    if (err?.code === 11000) {
      return Response.json(
        { received: true, duplicate: true, eventId },
        { status: 200 }
      );
    }

    return Response.json(
      { error: 'EVENT_PERSISTENCE_FAILED', message: 'Failed to record event' },
      { status: 500 }
    );
  }

  // 8. Process subscription lifecycle transitions (Wave 11B)
  let processingStatus = isSupported ? 'processed' : 'ignored';

  if (isSupported && metadata.providerSubscriptionId) {
    const normalizedLifecycle = normalizeRazorpayLifecycleEvent({
      eventType,
      subscriptionEntity: parsedPayload?.payload?.subscription?.entity,
      eventCreatedAt: metadata.providerCreatedAt || (parsedPayload?.created_at ? new Date(parsedPayload.created_at * 1000) : new Date()),
    });

    const expectedPlanId = process.env.RAZORPAY_PRO_MONTHLY_PLAN_ID?.trim();

    try {
      const result = await applyRazorpayLifecycleState(
        metadata.providerSubscriptionId,
        normalizedLifecycle,
        { expectedPlanId }
      );

      if (result.success) {
        processingStatus = 'processed';
        await BillingWebhookEvent.updateOne(
          { provider: 'razorpay', eventId },
          { $set: { processingStatus: 'processed', processedAt: new Date() } }
        );
      } else if (result.ignored) {
        processingStatus = 'ignored';
        await BillingWebhookEvent.updateOne(
          { provider: 'razorpay', eventId },
          { $set: { processingStatus: 'ignored', processedAt: new Date() } }
        );
      } else {
        processingStatus = 'failed';
        await BillingWebhookEvent.updateOne(
          { provider: 'razorpay', eventId },
          { $set: { processingStatus: 'failed', processedAt: new Date() } }
        );
      }
    } catch (processErr) {
      await BillingWebhookEvent.updateOne(
        { provider: 'razorpay', eventId },
        { $set: { processingStatus: 'failed', processedAt: new Date() } }
      );

      return Response.json(
        { error: 'LIFECYCLE_PROCESSING_FAILED', message: 'Failed to process subscription lifecycle' },
        { status: 500 }
      );
    }
  }

  // 9. Return fast 200 acknowledgement
  return Response.json(
    {
      received: true,
      eventId,
      eventType,
      status: processingStatus,
    },
    { status: 200 }
  );
}
