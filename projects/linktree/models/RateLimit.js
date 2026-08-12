// Default import + destructure, unlike the named imports in Page.js/Event.js: mongoose is
// CJS, and bare ESM node cannot always detect its named exports. This model is the only one
// loaded outside Next (by lib/rateLimit.js's self-check), so it is the only one that needs it.
import mongoose from 'mongoose';
const { model, models, Schema } = mongoose;

// Define the schema for the RateLimit model.
// D-17: limiter state lives here — no Redis, no external service, no in-memory Map
// (serverless has no shared memory, so a Map would limit per-lambda, i.e. not at all).
const RateLimitSchema = new Schema({
    key: { type: String, required: true }, // `${action}:${email|ip}`
    count: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, required: true }, // must be a Date, not a number
});

// Both indexes below are correctness-bearing, not optimisations.

// Without unique, two concurrent lambdas both miss the filter, both insert, and one
// key ends up with two documents — the effective limit silently doubles. With it, the
// loser gets an E11000 that checkRateLimit catches and retries once.
RateLimitSchema.index({ key: 1 }, { unique: true });

// expireAfterSeconds: 0 means "expire at the instant stored in this field".
// Garbage collection only — the limiter never trusts TTL deletion for correctness,
// because Mongo's TTL monitor sweeps on a ~60s interval.
RateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ponytail: fixed window, not sliding. A burst straddling a window boundary can reach
// 2x the limit. D-19's limits have enough headroom that this does not matter; switch to
// a sliding window only if that headroom ever stops being enough.

// Fix model initialization to handle Next.js hot reloading
export default models?.RateLimit || model('RateLimit', RateLimitSchema);
