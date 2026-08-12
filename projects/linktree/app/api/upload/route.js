import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { requireSession } from '@/lib/requireSession';
import { detectImageType } from '@/lib/magicBytes';

// D-10: 4 MB sits deliberately UNDER Vercel's 4.5 MB platform body limit, so our
// readable 413 is the one that fires instead of Vercel's opaque
// FUNCTION_PAYLOAD_TOO_LARGE. Above 4.5 MB the platform wins before this handler
// runs at all — that band is the client pre-check's job (D-29), not ours.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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

    await s3Client.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: newFileName,
        // D-15: public-read stays. Presigned URLs would have to be regenerated per
        // render on the public page, breaking caching and next/image.
        ACL: 'public-read',
        Body: buffer,
        ContentType: detected.mime,
    }));

    const link = `https://${BUCKET_NAME}.s3.amazonaws.com/${newFileName}`;
    return Response.json(link);
}
