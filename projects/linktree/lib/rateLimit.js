// Relative, not '@/' — this module's self-check runs under plain node, which has no
// bundler to resolve the jsconfig alias. Next resolves relative paths fine either way.
import connectToDatabase from './connectToDB.js';
import RateLimit from '../models/RateLimit.js';

// D-19 limits. Frozen so a caller cannot mutate a shared bucket definition.
const BASE_LIMITS = {
    upload: { windowMs: 60_000, max: 10 },
    pageSave: { windowMs: 60_000, max: 30 },
    claim: { windowMs: 3_600_000, max: 5 },
    click: { windowMs: 60_000, max: 60 },
};

// VALIDATION.md Wave 0 requires the window be injectable, so the 5/hour claim limit is
// exercisable in seconds rather than an hour. Guarded: never honoured in production,
// or an env var could silently disable every limit on the deployed app (T-03-04).
const positiveInt = (raw) => {
    const n = Number.parseInt(raw ?? '', 10);
    return Number.isInteger(n) && n > 0 ? n : null;
};

function buildLimits() {
    if (process.env.NODE_ENV === 'production') return BASE_LIMITS;

    const windowMs = positiveInt(process.env.RATE_LIMIT_WINDOW_MS);
    const max = positiveInt(process.env.RATE_LIMIT_MAX_OVERRIDE);
    if (windowMs === null && max === null) return BASE_LIMITS;

    console.warn(
        `[rateLimit] override active for every action — ` +
        `windowMs=${windowMs ?? 'default'} max=${max ?? 'default'}`
    );

    return Object.fromEntries(
        Object.entries(BASE_LIMITS).map(([action, limit]) => [action, {
            windowMs: windowMs ?? limit.windowMs,
            max: max ?? limit.max,
        }])
    );
}

export const LIMITS = Object.freeze(buildLimits());

// D-18: session email when authenticated, first x-forwarded-for entry when not.
// Namespaced by action or one user shares a single bucket across upload and page save.
export function rateLimitKey(action, session, req) {
    const email = session?.user?.email;
    if (email) return `${action}:${email}`;

    // On Vercel this header is a proxy chain and Vercel appends the real client IP
    // first. Taking the whole string would key on a value an attacker can extend by
    // prepending their own entries (T-03-01), so read only the first entry.
    const forwarded = req?.headers?.get?.('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim();

    // 'unknown' rather than skipping: an unheadered request must still be limited.
    // Server actions have no req at all, so an unauthenticated action lands here too.
    return `${action}:${ip || 'unknown'}`;
}

// Returns { allowed, retryAfter } where retryAfter is whole seconds until the window ends.
export async function checkRateLimit(action, key) {
    const limit = LIMITS[action];
    if (!limit) throw new Error(`unknown rate limit action: ${action}`);

    try {
        await connectToDatabase();
        const now = new Date();

        // The expiresAt filter is the whole point. Mongo's TTL monitor sweeps only every
        // ~60s, so an expired document stays readable — filtering on { key } alone and
        // then checking expiry on the result would increment a stale count before you
        // could see it. Here a stale doc fails the filter, the upsert path fires, and a
        // fresh window starts at count 1. TTL deletion is pure garbage collection.
        const run = () => RateLimit.findOneAndUpdate(
            { key, expiresAt: { $gt: now } },
            {
                $inc: { count: 1 },
                $setOnInsert: { key, expiresAt: new Date(now.getTime() + limit.windowMs) },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        let doc;
        try {
            doc = await run();
        } catch (err) {
            if (err?.code !== 11000) throw err;

            // E11000 has two causes and they need different handling:
            //
            //  (a) a concurrent lambda won the insert race — its fresh doc now exists,
            //      so re-running the increment finds and increments it.
            //  (b) a STALE doc still exists because Mongo's TTL sweep has not run yet.
            //      Re-running the identical query would miss the filter again and raise
            //      the same error forever, so the stale window must be reset explicitly.
            //
            // Try (b) first: claim the stale doc and start a fresh window at count 1.
            // Filtering on expiresAt <= now makes this safe under concurrency — only one
            // caller can match a given stale doc, and a fresh doc is never touched.
            doc = await RateLimit.findOneAndUpdate(
                { key, expiresAt: { $lte: now } },
                { $set: { count: 1, expiresAt: new Date(now.getTime() + limit.windowMs) } },
                { new: true },
            );

            // No stale doc matched, so this was case (a): retry the increment exactly
            // once. A second failure here is a real fault and propagates.
            if (!doc) doc = await run();
        }

        return {
            allowed: doc.count <= limit.max,
            // Never 0: Retry-After: 0 tells a client to retry immediately.
            retryAfter: Math.max(1, Math.ceil((doc.expiresAt - now) / 1000)),
        };
    } catch (error) {
        console.error('[rateLimit] check failed, allowing the request:', error);
        // ponytail: fail-open. A Mongo blip must not make the whole app unusable on a
        // personal project. A security-critical deployment would fail closed instead —
        // return { allowed: false } here and accept downtime over unlimited writes.
        return { allowed: true, retryAfter: 0 };
    }
}
