'use server';

import connectToDatabase from '@/lib/connectToDB';
import Feedback from '@/models/Feedback';
import Page from '@/models/Page';
import { requireSession } from '@/lib/requireSession';

/**
 * Submits a feedback or bug report from a user.
 */
export async function submitFeedback({ type = 'feedback', subject = '', message = '' }) {
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { success: false, error: 'Please enter your message or bug description.' };
  }

  const session = await requireSession();
  if (!session?.user?.email) {
    return { success: false, error: 'You must be logged in to submit feedback.' };
  }

  const cleanMessage = message.trim();
  const cleanSubject = (subject || '').trim().slice(0, 100);
  const cleanType = ['bug', 'feedback', 'feature', 'other'].includes(type) ? type : 'feedback';

  if (cleanMessage.length < 5) {
    return { success: false, error: 'Message must be at least 5 characters long.' };
  }

  try {
    await connectToDatabase();

    const userEmail = session.user.email.toLowerCase().trim();
    const userName = session.user.name || '';
    
    // Check if user has an associated pageUri
    const page = await Page.findOne({ owner: userEmail }).lean();
    const pageUri = page?.uri || '';

    const newFeedback = await Feedback.create({
      userEmail,
      userName,
      type: cleanType,
      subject: cleanSubject,
      message: cleanMessage,
      pageUri,
      status: 'open',
    });

    return {
      success: true,
      message: 'Thank you! Your report has been submitted to the admin team.',
      feedbackId: newFeedback._id.toString(),
    };
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return { success: false, error: 'Failed to submit report. Please try again.' };
  }
}
