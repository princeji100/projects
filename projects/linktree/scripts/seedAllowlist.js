// SEC-11 / D-05 — insert emails into the invite-only allowlist by hand.
//
// Run:  node --env-file=.env scripts/seedAllowlist.js <email> [<email> ...]
//
// This is the whole of Phase 1's allowlist management. The admin UI (ADMIN-01/02) is
// Phase 1.5. Insert-only on purpose: removing an email here would not evict that user's
// live database session, so removal needs the session cleanup that Phase 1.5 owns.

import mongoose from 'mongoose';
import AllowedUser from '../models/AllowedUser.js';

const emails = process.argv.slice(2).filter((a) => !a.startsWith('-'));

if (emails.length === 0) {
    console.error('usage: node --env-file=.env scripts/seedAllowlist.js <email> [<email> ...]');
    console.error('Adds each email to the invite-only allowlist. Re-running is a no-op.');
    process.exit(1);
}

async function main() {
    await mongoose.connect(process.env.MONGODB_URI);

    for (const raw of emails) {
        const email = raw.toLowerCase().trim();
        // $setOnInsert + upsert makes this idempotent — a second run matches the existing
        // document and writes nothing, rather than raising E11000 on the unique index.
        const res = await AllowedUser.updateOne(
            { email },
            { $setOnInsert: { email } },
            { upsert: true }
        );
        console.log(`${email}: ${res.upsertedCount > 0 ? 'added' : 'already present'}`);
    }

    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error('seedAllowlist FAILED:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
