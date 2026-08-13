import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/connectToDB';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getAnalyticsData } from '@/lib/analyticsData';
import { getPublicProfileUrl } from '@/lib/siteUrl';
import AnalyticsClient from '@/components/analytics/AnalyticsClient';
import UserNameForm from '@/components/forms/UserNameForm';

const AnalyticsPage = async ({ searchParams }) => {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  // Next.js 15: searchParams may be a Promise
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const rangeParam = resolvedSearchParams?.range;

  await connectToDatabase();
  const page = await Page.findOne({ owner: session.user.email });

  if (!page) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <UserNameForm />
      </div>
    );
  }

  const publicUrl = getPublicProfileUrl(page.uri);
  const analytics = await getAnalyticsData(page.uri, page.links || [], rangeParam);

  return (
    <AnalyticsClient
      analytics={analytics}
      publicUrl={publicUrl}
      uri={page.uri}
    />
  );
};

export default AnalyticsPage;