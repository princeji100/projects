import { requireSession } from '@/lib/requireSession';
import { redirect } from 'next/navigation';
import connectToDatabase from '@/lib/connectToDB';
import AllowedUser from '@/models/AllowedUser';
import InviteRequest from '@/models/InviteRequest';
import AdminAllowlistClient from '@/components/admin/AdminAllowlistClient';

export const metadata = {
  title: 'Admin Control Center | Linktree',
  description: 'Manage invite-only access and approve creator applications',
};

export default async function AdminPage() {
  const session = await requireSession();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()?.trim();

  // Strict server-side authorization gate.
  if (!session || !adminEmail || session.user.email.toLowerCase().trim() !== adminEmail) {
    redirect('/dashboard');
  }

  // Direct database read from Server Component
  await connectToDatabase();
  const [rawUsers, rawRequests] = await Promise.all([
    AllowedUser.find({}).sort({ createdAt: -1 }).lean(),
    InviteRequest.find({}).sort({ createdAt: -1 }).lean(),
  ]);

  const allowedUsers = rawUsers.map((user) => ({
    _id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
  }));

  const inviteRequests = rawRequests.map((req) => ({
    _id: req._id.toString(),
    email: req.email,
    handle: req.handle || '',
    note: req.note || '',
    status: req.status || 'pending',
    createdAt: req.createdAt ? req.createdAt.toISOString() : null,
  }));

  return (
    <div className="max-w-5xl mx-auto py-2">
      <AdminAllowlistClient
        initialAllowedUsers={allowedUsers}
        initialInviteRequests={inviteRequests}
        adminEmail={adminEmail}
      />
    </div>
  );
}
