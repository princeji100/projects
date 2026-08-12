// SEC-12 — the one-shot destructive wipe (D-06, D-07).
//
// Drops the five application collections and deletes every object in the S3 bucket, so
// Phase 1's gates never have to tolerate data claimed under no rules. Irreversible,
// including the owner's own page — confirmed by the owner (D-07).
//
// Run:  node --env-file=.env scripts/wipe.js --yes-destroy-everything
//
// ponytail: single-run Phase 1 scaffolding. Deliberately NOT wired into package.json
// scripts — an `npm run wipe` alias is one tab-completion away from destroying live data,
// and this file stays in the repo long after the phase ends. Phase 1.5's delete UI reuses
// lib/s3.js directly, not this script; nothing should ever import from here.

import mongoose from 'mongoose';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../lib/s3.js';

const CONFIRM_FLAG = '--yes-destroy-everything';

// pages / users / events are mongoose-owned; accounts / sessions belong to the NextAuth
// MongoDB adapter. `users` is very likely shared by both (models/User.js carries the
// adapter's emailVerified field), so it is dropped once by name and that covers both.
const COLLECTIONS = ['pages', 'users', 'events', 'accounts', 'sessions'];

// The confirmation gate comes before anything else — no connection, no env read, no
// listing. An unflagged run must be a guaranteed no-op (T-01-01).
if (!process.argv.includes(CONFIRM_FLAG)) {
    console.error('REFUSED: this script destroys all application data and is irreversible.');
    console.error(`Re-run with the exact flag ${CONFIRM_FLAG} if that is what you want:`);
    console.error(`  node --env-file=.env scripts/wipe.js ${CONFIRM_FLAG}`);
    console.error('Nothing was touched.');
    process.exit(1);
}

// A missing collection is a no-op in Mongo, so treat "ns not found" as done rather than
// as failure — this is the expected result for a collection the adapter never created.
const isNamespaceNotFound = (err) =>
    err?.code === 26 || err?.codeName === 'NamespaceNotFound' ||
    /ns not found/i.test(err?.message ?? '');

const isAccessDenied = (err) =>
    err?.name === 'AccessDenied' || err?.Code === 'AccessDenied' ||
    err?.$metadata?.httpStatusCode === 403;

function reportIamGap() {
    console.error('');
    console.error('AccessDenied from S3. The upload key has only ever done PutObject, so this is');
    console.error('the expected first-run outcome, not a bug in this script. Add both actions to');
    console.error('the IAM policy for the S3_ACCESS_KEY user, then re-run:');
    console.error(`  s3:ListBucket   on  arn:aws:s3:::${BUCKET_NAME}`);
    console.error(`  s3:DeleteObject on  arn:aws:s3:::${BUCKET_NAME}/*`);
}

async function wipeMongo() {
    // Standalone node script outside Next, so it connects directly rather than through
    // lib/connectToDB.js — that helper's readyState guard exists for request paths that
    // run many times per process. This process connects once and exits.
    await mongoose.connect(process.env.MONGODB_URI);

    // Printed before any drop: this is the only chance to record what actually existed,
    // and it answers whether mongoose's `users` and the adapter's `users` are one
    // collection (RESEARCH.md § Unresolved item 1).
    const present = (await mongoose.connection.db.listCollections().toArray())
        .map((c) => c.name).sort();
    console.log(`pre-wipe collections present (${present.length}): ${present.join(', ') || '(none)'}`);
    for (const name of present) {
        const count = await mongoose.connection.db.collection(name).countDocuments();
        console.log(`  ${name}: ${count} document(s)`);
    }
    console.log('');

    // Each drop is wrapped on its own so one absent collection cannot abort the rest.
    for (const name of COLLECTIONS) {
        try {
            await mongoose.connection.db.collection(name).drop();
            console.log(`mongo  ${name}: dropped`);
        } catch (err) {
            if (isNamespaceNotFound(err)) {
                console.log(`mongo  ${name}: already absent`);
                continue;
            }
            throw err;
        }
    }
}

async function wipeBucket() {
    let deleted = 0;
    let continuationToken;

    do {
        const page = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            ContinuationToken: continuationToken,
        }));

        if (page.Contents?.length) {
            // A list page is capped at 1000 keys and DeleteObjects accepts 1000, so the
            // batch size needs no separate chunking.
            const result = await s3Client.send(new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: { Objects: page.Contents.map((o) => ({ Key: o.Key })) },
            }));
            deleted += result.Deleted?.length ?? 0;

            // Per-key failures come back in the response body, not as a thrown error —
            // silently ignoring them would report a clean wipe over a partial one.
            if (result.Errors?.length) {
                for (const e of result.Errors) {
                    console.error(`s3     FAILED ${e.Key}: ${e.Code} ${e.Message}`);
                }
                throw Object.assign(new Error('some objects could not be deleted'), {
                    name: result.Errors[0].Code,
                    Code: result.Errors[0].Code,
                });
            }
        }

        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);

    console.log(`s3     ${BUCKET_NAME}: ${deleted} object(s) deleted`);
    return deleted;
}

async function main() {
    for (const name of ['MONGODB_URI', 'BUCKET_NAME']) {
        if (!process.env[name]) {
            // Bare `node` does not read .env, and a silent undefined here would look like
            // an empty database rather than a script that never reached one.
            console.error(`Missing ${name}. Run with: node --env-file=.env scripts/wipe.js ${CONFIRM_FLAG}`);
            process.exit(1);
        }
    }

    await wipeMongo();

    try {
        await wipeBucket();
    } catch (err) {
        if (isAccessDenied(err)) {
            reportIamGap();
            // Mongo is already wiped, so exit non-zero to make the S3 half visible while
            // leaving the completed half reported above. Re-running after the policy fix
            // is safe: the drops are idempotent.
            await mongoose.disconnect();
            process.exit(2);
        }
        throw err;
    }

    console.log('');
    console.log('wipe complete.');
    await mongoose.disconnect();
}

main().catch(async (err) => {
    console.error('wipe FAILED:', err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
