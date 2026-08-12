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
});

export const BUCKET_NAME = process.env.BUCKET_NAME;
