'use server';
import mongoose from 'mongoose';
import Page from '@/models/Page';
import { requireSession } from '@/lib/requireSession';
import { validateUsername } from '@/lib/username';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
let isConnected = false; // Track the MongoDB connection status

// Every exit returns { success: boolean, error?: string, retryAfter?: number, data?: object }.
// No path returns undefined — the caller reads result.success (D-24).
const handleFormSubmit = async (formdata) => {
    const username = formdata.get('username')?.toLowerCase(); // Convert to lowercase
    if (!username) {
        return { success: false, error: 'Username is required' };
    }

    // Session first: no reason to touch the database for an unauthenticated caller.
    const session = await requireSession();
    if (!session) {
        return { success: false, error: 'Authentication required' };
    }

    // SEC-06/SEC-07. lib/username.js is the only place the charset, length bounds and
    // reserved set live (D-24) — the claim form imports the same module, so the two
    // cannot disagree. Pass the validator's message straight through so the user sees
    // the actual reason rather than a generic failure.
    const valid = validateUsername(username);
    if (!valid.ok) {
        return { success: false, error: valid.error };
    }

    // SEC-05 / D-19: 5 per hour, the strictest limit in the phase — the claim path is
    // the username-enumeration channel. It runs AFTER validation so a malformed name
    // gets its real reason instead of burning a slot; enumeration needs well-formed names.
    // No req exists in a server action, so the key derives from the session email, which
    // step 2 guarantees is present.
    // ponytail: retryAfter rides on the returned object because a server action cannot
    // set a Retry-After header — only a route handler can. The two refusal shapes
    // (returned field here, header in app/api/*) are deliberate, not an inconsistency.
    const key = rateLimitKey('claim', session);
    const { allowed, retryAfter } = await checkRateLimit('claim', key);
    if (!allowed) {
        return { success: false, error: 'Too many attempts — please try again later', retryAfter };
    }

    try {
        // Phase 2 FIX-09 owns collapsing this into lib/connectToDB.js. Left as-is on purpose.
        if (!isConnected) {
            await mongoose.connect(process.env.MONGODB_URI);
            isConnected = true;
        }

        if (!Page) {
            console.error('Page model is undefined');
            return { success: false, error: 'Internal server error' };
        }

        const page = await Page.findOne({ uri: username });
        if (page) {
            return { success: false, error: 'Username already taken' };
        }

        const pageDoc = await Page.create({
            uri: username,
            owner: session.user.email
        });

        const plainPageDoc = {
            uri: pageDoc.uri,
            owner: pageDoc.owner,
            _id: pageDoc._id.toString(),
            createdAt: pageDoc.createdAt,
            updatedAt: pageDoc.updatedAt,
            __v: pageDoc.__v
        };
        return { success: true, data: plainPageDoc };
    } catch (err) {
        console.error('Error while saving the page:', err.message);
        return { success: false, error: err.message };
    }

};

export default handleFormSubmit;
