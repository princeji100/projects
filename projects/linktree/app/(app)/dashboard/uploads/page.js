import { requireSession } from '@/lib/requireSession';
import { redirect } from 'next/navigation';
import connectToDatabase from '@/lib/connectToDB';
import Upload from '@/models/Upload';
import User from '@/models/User';
import Page from '@/models/Page';
import UploadsManagerClient from '@/components/uploads/UploadsManagerClient';

export const metadata = {
  title: 'Uploads & Storage | Linktree',
  description: 'Manage your uploaded images and storage quota',
};

export default async function UploadsPage() {
  const session = await requireSession();
  if (!session) {
    redirect('/login');
  }

  // Direct database read from Server Component
  await connectToDatabase();
  const rawUploads = await Upload.find({ owner: session.user.email })
    .sort({ createdAt: -1 })
    .lean();

  const user = await User.findOne({ email: session.user.email }).lean();
  const page = await Page.findOne({ owner: session.user.email }).lean();

  // Pre-calculate active references map for fast lookup
  const activeReferences = {};

  if (user?.image) {
    activeReferences[user.image] = activeReferences[user.image] || [];
    activeReferences[user.image].push('Profile Avatar');
  }

  if (page?.bgImage) {
    activeReferences[page.bgImage] = activeReferences[page.bgImage] || [];
    activeReferences[page.bgImage].push('Page Background');
  }

  if (Array.isArray(page?.links)) {
    page.links.forEach((link) => {
      if (link?.icon) {
        activeReferences[link.icon] = activeReferences[link.icon] || [];
        const label = link.title ? `Link: ${link.title}` : 'Link Icon';
        if (!activeReferences[link.icon].includes(label)) {
          activeReferences[link.icon].push(label);
        }
      }
    });
  }

  const initialUploads = (rawUploads || []).map((u) => ({
    _id: u._id ? u._id.toString() : String(Math.random()),
    key: u.key || '',
    size: typeof u.size === 'number' ? u.size : 0,
    url: u.url || '',
    createdAt: u.createdAt
      ? u.createdAt instanceof Date
        ? u.createdAt.toISOString()
        : String(u.createdAt)
      : null,
  }));

  return (
    <div className="max-w-5xl mx-auto py-2">
      <UploadsManagerClient
        initialUploads={initialUploads}
        activeReferences={activeReferences}
      />
    </div>
  );
}
