import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req) {
    const formData = await req.formData();
    if (formData.has('file')) {
        const file = formData.get('file');
        const s3Client = new S3Client({
            region: 'eu-north-1',
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY,
                secretAccessKey: process.env.S3_SECRET_KEY,
            }
        })
        const randomId = uuidv4()
        const ext = file.name.split('.').pop();
        const newFileName = randomId + '.' + ext;
        const bucketName = process.env.BUCKET_NAME
        const chunks = [];
        for await (const chunk of file.stream()) {
            chunks.push(chunk);
        }
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: newFileName,
            ACL: 'public-read',
            Body: Buffer.concat(chunks),
            ContentType: file.type,
        }))
        const link = `https://${bucketName}.s3.amazonaws.com/${newFileName}`;
        return Response.json(link)
    } else {
        console.error('No file provided')
        return Response.json({ error: 'No file provided' })
    }
}