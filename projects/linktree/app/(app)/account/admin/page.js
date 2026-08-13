import { requireSession } from '@/lib/requireSession';
import { redirect } from 'next/navigation';
import connectToDatabase from '@/lib/connectToDB';
import AllowedUser from '@/models/AllowedUser';
import AdminAllowlistClient from '@/components/admin/AdminAllowlistClient';

export const metadata = {
  title: 'Admin Allowlist | Linktree',
  description: 'Manage invite-only access to Linktree',
};

export default async function AdminPage() {
  const session = await requireSession();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase()?.trim();

  // D-03 / D-04 / D-05: Strict server-side authorization gate.
  // If not logged in, ADMIN_EMAIL unset, or caller does not match ADMIN_EMAIL, fail closed.
  if (!session || !adminEmail || session.user.email.toLowerCase().trim() !== adminEmail) {
    redirect('/account');
  }

  // Direct database read from Server Component
  await connectToDatabase();
  const rawUsers = await AllowedUser.find({}).sort({ createdAt: -1 }).lean();

  const allowedUsers = rawUsers.map((user) => ({
    _id: user._id.toString(),
    email: user.email,
    createdAt: user.createdAt ? user.createdAt.toISOString() : null,
  }));

  return (
    <div className="max-w-4xl mx-auto py-2">
      <AdminAllowlistClient
        initialAllowedUsers={allowedUsers}
        adminEmail={adminEmail}
      />
    </div>
  );
}
