'use server';

import { requireSession } from '@/lib/requireSession';
import connectToDatabase from '@/lib/connectToDB';
import AllowedUser from '@/models/AllowedUser';
import InviteRequest from '@/models/InviteRequest';
import clientPromise from '@/lib/db';
import { revalidatePath } from 'next/cache';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Verifies that the caller has a valid session and is the configured ADMIN_EMAIL.
 * Fails closed if ADMIN_EMAIL is unset, malformed, or does not match.
 */
async function verifyAdminCaller() {
  const session = await requireSession();
  if (!session?.user?.email) {
    return { ok: false, error: 'Authentication required', status: 401 };
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()?.trim();
  if (!adminEmail) {
    // Fail closed if ADMIN_EMAIL is not configured
    return { ok: false, error: 'Admin access is not configured on this system', status: 403 };
  }

  const callerEmail = session.user.email.toLowerCase().trim();
  if (callerEmail !== adminEmail) {
    return { ok: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return { ok: true, session, adminEmail };
}

/**
 * Adds an email to the invite-only allowlist.
 * Validates, trims, and lowercases the email before idempotent upsert.
 */
export async function addAllowedUser(rawEmail) {
  const auth = await verifyAdminCaller();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  if (typeof rawEmail !== 'string') {
    return { success: false, error: 'Invalid email address provided' };
  }

  const email = rawEmail.toLowerCase().trim();
  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: 'Please provide a valid email address' };
  }

  try {
    await connectToDatabase();
    await AllowedUser.findOneAndUpdate(
      { email },
      { email },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    revalidatePath('/dashboard/admin');
    return { success: true, message: `Added ${email} to allowlist` };
  } catch (error) {
    console.error('Error adding allowed user:', error);
    return { success: false, error: 'Failed to add user to allowlist' };
  }
}

/**
 * Removes an email from the allowlist and revokes all active database sessions.
 * Preserves the user's Page, Upload, and S3 data (D-08).
 */
export async function removeAllowedUser(rawEmail) {
  const auth = await verifyAdminCaller();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  if (typeof rawEmail !== 'string') {
    return { success: false, error: 'Invalid email address provided' };
  }

  const email = rawEmail.toLowerCase().trim();
  if (!email) {
    return { success: false, error: 'Email address cannot be empty' };
  }

  try {
    await connectToDatabase();
    // 1. Delete from AllowedUser
    await AllowedUser.deleteOne({ email });

    // 2. Revoke all active database sessions in NextAuth's MongoDB sessions collection (D-07)
    try {
      const client = await clientPromise;
      const db = client.db();
      const userDoc = await db.collection('users').findOne({ email });
      if (userDoc?._id) {
        await db.collection('sessions').deleteMany({
          $or: [
            { userId: userDoc._id },
            { userId: userDoc._id.toString() },
          ],
        });
      }
    } catch (sessionErr) {
      console.error('Warning: Failed to clear database sessions for revoked user:', sessionErr);
    }

    revalidatePath('/dashboard/admin');
    return { success: true, message: `Removed ${email} from allowlist and revoked sessions` };
  } catch (error) {
    console.error('Error removing allowed user:', error);
    return { success: false, error: 'Failed to remove user from allowlist' };
  }
}

/**
 * Approves a pending invite request and automatically adds the user to the allowlist.
 */
export async function approveInviteRequest(requestId) {
  const auth = await verifyAdminCaller();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();
    const req = await InviteRequest.findById(requestId);
    if (!req) {
      return { success: false, error: 'Request not found' };
    }

    const email = req.email.toLowerCase().trim();

    // 1. Add email to AllowedUser allowlist
    await AllowedUser.findOneAndUpdate(
      { email },
      { email },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // 2. Mark request as approved
    req.status = 'approved';
    await req.save();

    revalidatePath('/dashboard/admin');
    return { success: true, message: `Approved ${email}! They can now sign in with Google.` };
  } catch (error) {
    console.error('Error approving invite request:', error);
    return { success: false, error: 'Failed to approve request' };
  }
}

/**
 * Rejects a pending invite request.
 */
export async function rejectInviteRequest(requestId) {
  const auth = await verifyAdminCaller();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();
    await InviteRequest.findByIdAndUpdate(requestId, { status: 'rejected' });
    revalidatePath('/dashboard/admin');
    return { success: true, message: 'Request marked as rejected' };
  } catch (error) {
    console.error('Error rejecting invite request:', error);
    return { success: false, error: 'Failed to reject request' };
  }
}

/**
 * Deletes an invite request record entirely.
 */
export async function deleteInviteRequest(requestId) {
  const auth = await verifyAdminCaller();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await connectToDatabase();
    await InviteRequest.findByIdAndDelete(requestId);
    revalidatePath('/dashboard/admin');
    return { success: true, message: 'Invite request deleted' };
  } catch (error) {
    console.error('Error deleting invite request:', error);
    return { success: false, error: 'Failed to delete request' };
  }
}
