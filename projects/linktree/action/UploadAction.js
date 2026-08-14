'use server';

import { requireSession } from '@/lib/requireSession';
import connectToDatabase from '@/lib/connectToDB';
import Upload from '@/models/Upload';
import User from '@/models/User';
import Page from '@/models/Page';
import { s3Client, BUCKET_NAME } from '@/lib/s3';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { revalidatePath } from 'next/cache';

/**
 * Checks where an upload is currently referenced by the user (Avatar, Background, Link Icons).
 */
export async function getUploadReferences(uploadId) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    await connectToDatabase();
    const upload = await Upload.findById(uploadId);
    if (!upload) {
      return { success: false, error: 'Upload not found' };
    }

    if (upload.owner !== session.user.email) {
      return { success: false, error: 'Forbidden: You do not own this upload' };
    }

    const references = [];

    // Check user avatar
    const user = await User.findOne({ email: session.user.email });
    if (user?.image === upload.url) {
      references.push('Profile Avatar');
    }

    // Check page background and link icons
    const page = await Page.findOne({ owner: session.user.email });
    if (page) {
      if (page.bgImage === upload.url) {
        references.push('Page Background');
      }

      if (Array.isArray(page.links)) {
        const matchingLinks = page.links.filter((l) => l.icon === upload.url);
        if (matchingLinks.length === 1) {
          references.push(`Link Icon (${matchingLinks[0].title || 'Untitled Link'})`);
        } else if (matchingLinks.length > 1) {
          references.push(`${matchingLinks.length} Link Icons`);
        }
      }
    }

    return {
      success: true,
      inUse: references.length > 0,
      references,
      upload: {
        id: upload._id.toString(),
        key: upload.key,
        url: upload.url,
        size: upload.size,
      },
    };
  } catch (error) {
    console.error('Error checking upload references:', error);
    return { success: false, error: 'Failed to inspect upload references' };
  }
}

/**
 * Deletes an upload from S3 and MongoDB, and safely unsets any references
 * in the User and Page models (D-15, D-17).
 */
export async function deleteUpload(uploadId) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    await connectToDatabase();
    const upload = await Upload.findById(uploadId);
    if (!upload) {
      return { success: false, error: 'Upload not found' };
    }

    // D-13: Strict ownership enforcement
    if (upload.owner !== session.user.email) {
      return { success: false, error: 'Forbidden: You do not own this upload' };
    }

    const uploadUrl = upload.url;
    const uploadKey = upload.key;

    // 1. Delete object from AWS S3
    try {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: uploadKey,
        })
      );
    } catch (s3Err) {
      console.error('S3 DeleteObjectCommand failed:', s3Err);
      return { success: false, error: 'Failed to delete file from cloud storage. Deletion aborted.' };
    }

    // 2. Delete Upload document from MongoDB
    await Upload.deleteOne({ _id: uploadId });

    // 3. Clear active references in User (avatar)
    await User.updateMany(
      { email: session.user.email, image: uploadUrl },
      { $set: { image: '' } }
    );

    // 4. Clear active references in Page (bgImage)
    await Page.updateMany(
      { owner: session.user.email, bgImage: uploadUrl },
      { $set: { bgImage: '' } }
    );

    // 5. Clear active references in Page (links[].icon)
    const pages = await Page.find({ owner: session.user.email });
    for (const p of pages) {
      if (Array.isArray(p.links)) {
        let hasIconMatches = false;
        const updatedLinks = p.links.map((link) => {
          const linkObj = typeof link.toObject === 'function' ? link.toObject() : link;
          if (linkObj && linkObj.icon === uploadUrl) {
            hasIconMatches = true;
            return { ...linkObj, icon: '' };
          }
          return linkObj;
        });

        if (hasIconMatches) {
          await Page.updateOne(
            { _id: p._id },
            { $set: { links: updatedLinks } }
          );
        }
      }
    }

    revalidatePath('/dashboard/uploads');
    revalidatePath('/dashboard');
    return { success: true, message: 'Upload permanently deleted and references cleared' };
  } catch (error) {
    console.error('Error during upload deletion cascade:', error);
    return { success: false, error: 'Failed to complete upload deletion' };
  }
}
