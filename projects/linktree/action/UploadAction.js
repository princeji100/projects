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
 * Deletes a single upload from S3 and MongoDB, and safely unsets any references.
 */
export async function deleteUpload(uploadId) {
  return deleteBulkUploads([uploadId]);
}

/**
 * Bulk Deletes multiple uploads from S3 and MongoDB, and cascades reference removals.
 */
export async function deleteBulkUploads(uploadIds = []) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return { success: false, error: 'Authentication required' };
  }

  if (!Array.isArray(uploadIds) || uploadIds.length === 0) {
    return { success: false, error: 'No upload IDs provided' };
  }

  try {
    await connectToDatabase();
    const uploads = await Upload.find({
      _id: { $in: uploadIds },
      owner: session.user.email,
    });

    if (uploads.length === 0) {
      return { success: false, error: 'No matching uploads found' };
    }

    const deletedUrls = [];
    const deletePromises = uploads.map(async (upload) => {
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: upload.key,
          })
        );
        deletedUrls.push(upload.url);
      } catch (s3Err) {
        console.error(`S3 deletion failed for key ${upload.key}:`, s3Err);
      }
    });

    await Promise.allSettled(deletePromises);

    // Remove records from MongoDB
    await Upload.deleteMany({
      _id: { $in: uploads.map((u) => u._id) },
      owner: session.user.email,
    });

    // Clear active references in User (avatar)
    if (deletedUrls.length > 0) {
      await User.updateMany(
        { email: session.user.email, image: { $in: deletedUrls } },
        { $set: { image: '' } }
      );

      // Clear active references in Page (bgImage)
      await Page.updateMany(
        { owner: session.user.email, bgImage: { $in: deletedUrls } },
        { $set: { bgImage: '' } }
      );

      // Clear active references in Page (links[].icon)
      const pages = await Page.find({ owner: session.user.email });
      for (const p of pages) {
        if (Array.isArray(p.links)) {
          let hasIconMatches = false;
          const updatedLinks = p.links.map((link) => {
            const linkObj = typeof link.toObject === 'function' ? link.toObject() : link;
            if (linkObj && deletedUrls.includes(linkObj.icon)) {
              hasIconMatches = true;
              return { ...linkObj, icon: '' };
            }
            return linkObj;
          });

          if (hasIconMatches) {
            await Page.updateOne({ _id: p._id }, { $set: { links: updatedLinks } });
          }
        }
      }
    }

    revalidatePath('/dashboard/uploads');
    revalidatePath('/dashboard');
    return {
      success: true,
      message: `Successfully deleted ${uploads.length} media ${uploads.length === 1 ? 'file' : 'files'}`,
    };
  } catch (error) {
    console.error('Error during bulk upload deletion:', error);
    return { success: false, error: 'Failed to complete bulk deletion' };
  }
}

/**
 * Sets an uploaded image as the user's active Profile Avatar in 1 click.
 */
export async function setUploadAsAvatar(uploadUrl) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return { success: false, error: 'Authentication required' };
  }

  if (!uploadUrl) {
    return { success: false, error: 'Invalid image URL' };
  }

  try {
    await connectToDatabase();
    await User.updateOne(
      { email: session.user.email },
      { $set: { image: uploadUrl } }
    );

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/uploads');
    return { success: true, message: 'Profile avatar updated successfully!' };
  } catch (error) {
    console.error('Error setting avatar:', error);
    return { success: false, error: 'Failed to update avatar' };
  }
}

/**
 * Sets an uploaded image as the user's active Page Background in 1 click.
 */
export async function setUploadAsBackground(uploadUrl) {
  const session = await requireSession();
  if (!session?.user?.email) {
    return { success: false, error: 'Authentication required' };
  }

  if (!uploadUrl) {
    return { success: false, error: 'Invalid image URL' };
  }

  try {
    await connectToDatabase();
    const page = await Page.findOne({ owner: session.user.email });
    if (!page) {
      return { success: false, error: 'Page profile not found' };
    }

    await Page.updateOne(
      { owner: session.user.email },
      { $set: { bgType: 'image', bgImage: uploadUrl } }
    );

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/uploads');
    if (page.uri) {
      revalidatePath(`/${page.uri}`);
    }

    return { success: true, message: 'Page background updated successfully!' };
  } catch (error) {
    console.error('Error setting background:', error);
    return { success: false, error: 'Failed to update background' };
  }
}
