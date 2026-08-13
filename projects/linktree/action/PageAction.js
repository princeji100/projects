'use server'
import Page from "@/models/Page"
import User from "@/models/User"
import connectToDatabase from "@/lib/connectToDB"
import { requireSession } from "@/lib/requireSession"
import * as rateLimit from "@/lib/rateLimit"

// All three saves share ONE bucket. D-19's 30/min is per user for saving a page, not
// per form — three separate buckets would let a caller cycle the forms for 90/min.
const SAVE_ACTION = 'pageSave';

// ponytail: the two refusal shapes in this phase are a platform constraint, not a
// design preference. A route handler can set headers, so /api/upload refuses with a
// 429 plus Retry-After. A server action returns a value and cannot touch headers, so
// retryAfter rides on the returned object and the calling component raises the toast.
//
// One gate, not three copies: three call sites would be three places to get the
// limiter's expiresAt filter wrong. Not exported — an exported async function in a
// 'use server' module becomes a fourth publicly-callable server action.
async function checkSaveGate() {
    const session = await requireSession();
    if (!session) {
        return { allowed: false, result: { success: false, error: 'Authentication required' } };
    }

    // No req exists in a server action, so the key falls through to the session email.
    const key = rateLimit.rateLimitKey(SAVE_ACTION, session);
    const { allowed, retryAfter } = await rateLimit.checkRateLimit(SAVE_ACTION, key);
    if (!allowed) {
        return {
            allowed: false,
            result: { success: false, error: 'Too many saves — please wait a moment', retryAfter },
        };
    }

    return { allowed: true, session };
}

const SavePageSetting = async (formData) => {
    const gate = await checkSaveGate();
    if (!gate.allowed) return gate.result;

    try {
        await connectToDatabase();
        const dataKey = ['displayName', 'location', 'bio', 'bgType', 'bgColor', 'bgImage'];
        const dataToUpdate = {};
        for (const key of dataKey) {
            if (formData.has(key)) {
                dataToUpdate[key] = formData.get(key);
            }
        }
        await Page.updateOne({ owner: gate.session.user.email }, dataToUpdate);
        if (formData.has('avatar')) {
            const avatarLink = formData.get('avatar');
            await User.updateOne(
                { email: gate.session.user.email },
                { image: avatarLink },
            );
        }
        return { success: true };
    } catch (error) {
        console.error('Error saving page settings:', error);
        return { success: false, error: 'Failed to save settings' };
    }
};

const SavePageButton = async (formData) => {
    const gate = await checkSaveGate();
    if (!gate.allowed) return gate.result;

    try {
        await connectToDatabase();
        const buttonsValues = {};
        formData.forEach((value, key) => {
            buttonsValues[key] = value;
        });
        await Page.updateOne({ owner: gate.session.user.email }, { buttons: buttonsValues });
        return { success: true };
    } catch (error) {
        console.error('Error saving buttons:', error);
        return { success: false, error: 'Failed to save buttons' };
    }
};

const SavePageLinks = async (links) => {
    const gate = await checkSaveGate();
    if (!gate.allowed) return gate.result;

    try {
        await connectToDatabase();
        await Page.updateOne({ owner: gate.session.user.email }, { links });
        // FIX-01 (Phase 2): this is the SUCCESS path and it reports failure. This plan
        // changed only the shape — the falsy truthiness is preserved deliberately so the
        // semantics are identical to before. No `error` field, which is how the caller
        // tells this apart from a real refusal; fix the value here, not the caller.
        return { success: false };
    } catch (error) {
        console.error('Error saving links:', error);
        return { success: false, error: 'Failed to save links' };
    }
};

export { SavePageSetting, SavePageButton , SavePageLinks};
