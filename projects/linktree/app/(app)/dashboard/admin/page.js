import { requireSession } from '@/lib/requireSession';
import { redirect } from 'next/navigation';
import connectToDatabase from '@/lib/connectToDB';
import AllowedUser from '@/models/AllowedUser';
import InviteRequest from '@/models/InviteRequest';
import Feedback from '@/models/Feedback';
import Page from '@/models/Page';
import User from '@/models/User';
import Subscription from '@/models/Subscription';
import AdminAllowlistClient from '@/components/admin/AdminAllowlistClient';
import { isUserAdmin, getAdminEmail } from '@/lib/admin';

export const metadata = {
  title: 'Admin Control Center | Prince Links',
  description: 'Manage invite-only access, handles, user feedback, and manual Pro entitlements',
};

export default async function AdminPage() {
  const session = await requireSession();
  const adminEmail = getAdminEmail();

  // Strict server-side authorization gate.
  if (!session?.user?.email || !isUserAdmin(session.user.email)) {
    redirect('/dashboard');
  }

  // Direct database read from Server Component
  await connectToDatabase();
  const [rawAllowedUsers, rawRequests, rawFeedbacks, rawPages, rawActualUsers, rawSubscriptions] = await Promise.all([
    AllowedUser.find({}).sort({ createdAt: -1 }).lean(),
    InviteRequest.find({}).sort({ createdAt: -1 }).lean(),
    Feedback.find({}).sort({ createdAt: -1 }).lean(),
    Page.find({}, { uri: 1, owner: 1, displayName: 1, links: 1, updatedAt: 1 }).lean(),
    User.find({}, { _id: 1, email: 1, name: 1 }).lean(),
    Subscription.find({}, { userId: 1, plan: 1, status: 1, provider: 1 }).lean(),
  ]);

  // Map pages by owner email for instant handle lookup
  const pageMap = new Map();
  rawPages.forEach((p) => {
    if (p.owner) {
      pageMap.set(p.owner.toLowerCase().trim(), {
        uri: p.uri,
        displayName: p.displayName || '',
        linksCount: p.links ? p.links.length : 0,
        updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
      });
    }
  });

  // Map actual user accounts by email
  const userByEmail = new Map();
  rawActualUsers.forEach((u) => {
    if (u.email) {
      userByEmail.set(u.email.toLowerCase().trim(), u);
    }
  });

  // Map subscriptions by userId string
  const subByUserId = new Map();
  rawSubscriptions.forEach((s) => {
    if (s.userId) {
      subByUserId.set(s.userId.toString(), s);
    }
  });

  const allowedUsers = rawAllowedUsers.map((user) => {
    const emailKey = user.email.toLowerCase().trim();
    const userPage = pageMap.get(emailKey);
    const actualUser = userByEmail.get(emailKey);
    const userId = actualUser?._id ? actualUser._id.toString() : null;
    const userSub = userId ? subByUserId.get(userId) : null;

    let planTier = 'free'; // 'free' | 'manual_pro' | 'provider_pro'
    if (userSub?.plan === 'pro' && (userSub?.status === 'active' || userSub?.status === 'trialing')) {
      planTier = userSub.provider === 'manual' ? 'manual_pro' : 'provider_pro';
    }

    return {
      _id: user._id.toString(),
      userId,
      email: user.email,
      handle: userPage?.uri || null,
      displayName: actualUser?.name || userPage?.displayName || '',
      linksCount: userPage?.linksCount || 0,
      planTier,
      hasSubscription: Boolean(userSub),
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
    };
  });

  const inviteRequests = rawRequests.map((req) => ({
    _id: req._id.toString(),
    email: req.email,
    handle: req.handle || '',
    note: req.note || '',
    status: req.status || 'pending',
    createdAt: req.createdAt ? req.createdAt.toISOString() : null,
  }));

  const feedbacks = rawFeedbacks.map((f) => ({
    _id: f._id.toString(),
    userEmail: f.userEmail,
    userName: f.userName || '',
    type: f.type || 'feedback',
    subject: f.subject || '',
    message: f.message || '',
    pageUri: f.pageUri || '',
    status: f.status || 'open',
    adminNote: f.adminNote || '',
    createdAt: f.createdAt ? f.createdAt.toISOString() : null,
  }));

  return (
    <div className="max-w-5xl mx-auto py-2">
      <AdminAllowlistClient
        initialAllowedUsers={allowedUsers}
        initialInviteRequests={inviteRequests}
        initialFeedbacks={feedbacks}
        adminEmail={adminEmail}
      />
    </div>
  );
}
