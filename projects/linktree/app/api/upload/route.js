import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';
import { s3Client, BUCKET_NAME } from '@/lib/s3';

export async function POST(req) {
    const formData = await req.formData();
    if (formData.has('file')) {
        const file = formData.get('file');
        const randomId = uuidv4()
        const ext = file.name.split('.').pop();
        const newFileName = randomId + '.' + ext;
        const chunks = [];
        for await (const chunk of file.stream()) {
            chunks.push(chunk);
        }
        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: newFileName,
            ACL: 'public-read',
            Body: Buffer.concat(chunks),
            ContentType: file.type,
        }))
        const link = `https://${BUCKET_NAME}.s3.amazonaws.com/${newFileName}`;
        return Response.json(link)
    } else {
        console.error('No file provided')
        return Response.json({ error: 'No file provided' })
    }
}