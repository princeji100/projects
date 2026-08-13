import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { requireSession } from '@/lib/requireSession';
import { detectImageType } from '@/lib/magicBytes';
import { checkRateLimit, rateLimitKey } from '@/lib/rateLimit';
import connectToDatabase from '@/lib/connectToDB';
import Upload from '@/models/Upload';

// D-10: 4 MB sits deliberately UNDER Vercel's 4.5 MB platform body limit, so our
// readable 413 is the one that fires instead of Vercel's opaque
// FUNCTION_PAYLOAD_TOO_LARGE. Above 4.5 MB the platform wins before this handler
// runs at all — that band is the client pre-check's job (D-29), not ours.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// D-11: per-owner byte cap. Freeing quota by deleting is Phase 1.5, so the refusal
// message tells the owner to replace an existing image rather than to delete one.
const QUOTA_BYTES = 25 * 1024 * 1024;

export async function POST(req) {
    // Gate 1 — session (SEC-01, D-09). First, before req.formData(): there is no
    // reason to parse a multipart body for a request that has no business here.
    const session = await requireSession();
    if (!session) {
        return Response.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    // The old branch returned an implicit 200 with an error body — same class of bug
    // as SEC-08. A string entry has no .stream(), so it is "no file" too.
    if (!file || typeof file.stream !== 'function') {
        return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Gate 2 — size (SEC-02, D-10). file.size is available before the stream is read,
    // so an oversized upload is refused without buffering 4 MB to find that out.
    if (file.size > MAX_UPLOAD_BYTES) {
        return Response.json({ error: 'File too large — maximum 4 MB' }, { status: 413 });
    }

    const chunks = [];
    for await (const chunk of file.stream()) {
        chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Gate 3 — magic bytes (SEC-03, D-13, D-14). The bytes decide, never the client.
    const detected = detectImageType(buffer);
    if (!detected) {
        return Response.json(
            { error: 'Only JPEG, PNG and WEBP images are allowed' },
            { status: 415 },
        );
    }

    // Both the extension and the ContentType come from the DETECTED type. The client's
    // declared type and filename are never read — objects stay public-read (D-15), so
    // PNG-magic bytes sent with a Content-Type of image/svg+xml would otherwise be stored
    // and served back as SVG, the exact stored-XSS vector D-13/D-15 exist to close.
    // The only legitimate reads off the entry are .size and .stream().
    const newFileName = `${uuidv4()}.${detected.ext}`;

    // Gate 4 — quota (SEC-04, D-11, D-16). Upload is the source of truth for bytes
    // stored, so the sum comes from the records, not from listing the bucket.
    await connectToDatabase();
    const [used] = await Upload.aggregate([
        { $match: { owner: session.user.email } },
        { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    // ponytail: two concurrent uploads can both pass this check and jointly exceed the
    // cap. Blast radius is one extra file, bounded at 4 MB. Atlas free tier is a replica
    // set so a transaction is available, but it is not worth it for a 4 MB overshoot —
    // upgrade to a transaction or a conditional update if quota ever becomes billable.
    if ((used?.total ?? 0) + file.size > QUOTA_BYTES) {
        return Response.json(
            { error: 'Upload limit reached (25 MB) — replace an existing image' },
            { status: 413 },
        );
    }

    // Gate 5 — rate limit (SEC-05, D-19, D-20). Last of the gates: it mutates a counter,
    // so a request already doomed by quota should not spend one of the owner's slots.
    const key = rateLimitKey('upload', session, req);
    const { allowed, retryAfter } = await checkRateLimit('upload', key);
    if (!allowed) {
        return Response.json(
            { error: 'Too many uploads — please wait' },
            { status: 429, headers: { 'Retry-After': String(retryAfter) } },
        );
    }

    try {
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: newFileName,
            // D-15: public-read stays. Presigned URLs would have to be regenerated per
            // render on the public page, breaking caching and next/image.
            ACL: 'public-read',
            Body: buffer,
            ContentType: detected.mime,
        }));
    } catch (error) {
        // Detail to the server log only — S3 error text can name the bucket (T-04-08).
        console.error('[upload] S3 put failed:', error);
        return Response.json({ error: 'Upload failed' }, { status: 502 });
    }

    const link = `https://${BUCKET_NAME}.s3.amazonaws.com/${newFileName}`;

    // The record is written only AFTER a successful put, and the order is load-bearing:
    // recording first would let a failed put permanently burn quota that no object
    // occupies. The reverse leak — an object with no record — is recoverable by listing
    // the bucket, which is what Phase 1.5's delete UI walks anyway.
    await Upload.create({
        owner: session.user.email,
        key: newFileName,
        size: file.size,
        url: link,
    });

    return Response.json(link);
}
