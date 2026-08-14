'use server';

import connectToDatabase from '@/lib/connectToDB';
import InviteRequest from '@/models/InviteRequest';
import AllowedUser from '@/models/AllowedUser';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public action for users to apply for invite-only early access.
 */
export async function submitInviteRequest(formData) {
  const email = formData?.email?.toLowerCase()?.trim();
  const handle = formData?.handle?.toLowerCase()?.trim()?.replace(/[^a-z0-9_-]/g, '') || '';
  const note = formData?.note?.trim() || '';

  if (!email || !EMAIL_REGEX.test(email)) {
    return { success: false, error: 'Please provide a valid email address' };
  }

  try {
    await connectToDatabase();

    // Check if user is already whitelisted
    const alreadyAllowed = await AllowedUser.findOne({ email });
    if (alreadyAllowed) {
      return {
        success: true,
        alreadyApproved: true,
        message: 'Your email is already approved! You can sign in directly with Google.',
      };
    }

    // Upsert or create invite request
    const request = await InviteRequest.findOneAndUpdate(
      { email },
      { email, handle, note, status: 'pending' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return {
      success: true,
      message: 'Invite request submitted successfully! The admin will review and approve your account shortly.',
    };
  } catch (error) {
    console.error('Error submitting invite request:', error);
    return { success: false, error: 'Failed to submit request. Please try again later.' };
  }
}
