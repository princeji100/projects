import { S3Client } from '@aws-sdk/client-s3';

// The single S3 client construction site. Was inline in app/api/upload/route.js;
// the wipe script needs one now and Phase 1.5's delete UI needs one later.
//
// Region stays a literal — one bucket, one region, and a new env var for a value that
// never changes is config for nothing.
export const s3Client = new S3Client({
    region: 'eu-north-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        // Note: S3_SECRET_KEY, not S3_SECRET_ACCESS_KEY. This is the name in .env.
        secretAccessKey: process.env.S3_SECRET_KEY,
    },
    // The SDK's default connection timeout is short enough that a first call from a
    // home connection to eu-north-1 fails with TimeoutError before TLS completes —
    // observed while verifying ListBucket for the wipe. A TimeoutError there is easy to
    // misread as the AccessDenied this phase predicts, so give the handshake room.
    // Object literal rather than `new NodeHttpHandler(...)` to avoid importing a
    // transitive @smithy package that is not a declared dependency.
    requestHandler: { connectionTimeout: 15_000, requestTimeout: 30_000 },
});

export const BUCKET_NAME = process.env.BUCKET_NAME;
