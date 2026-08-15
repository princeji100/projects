import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/connectToDB';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { getAnalyticsData } from '@/lib/analyticsData';
import { getCanonicalProfileUrl } from '@/lib/siteUrl';
import { getSafeUserEntitlements } from '@/lib/featureAccess';
import { resolveAnalyticsRange } from '@/lib/analyticsRanges';
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

  // Server-authoritative entitlement resolution for extended analytics
  const entitlements = await getSafeUserEntitlements(session.user.id);
  const canUseExtendedAnalytics = Boolean(entitlements?.features?.extended_analytics);
  const effectiveRange = resolveAnalyticsRange(rangeParam, canUseExtendedAnalytics);
  const isRestricted = Boolean(
    rangeParam &&
    !canUseExtendedAnalytics &&
    ['90d', '365d'].includes(rangeParam.toLowerCase().trim())
  );

  await connectToDatabase();
  const page = await Page.findOne({ owner: session.user.email });

  if (!page) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <UserNameForm />
      </div>
    );
  }

  const publicUrl = getCanonicalProfileUrl(page);
  const analytics = await getAnalyticsData(page.uri, page.links || [], effectiveRange);

  return (
    <AnalyticsClient
      analytics={analytics}
      publicUrl={publicUrl}
      uri={page.uri}
      canUseExtendedAnalytics={canUseExtendedAnalytics}
      isRestricted={isRestricted}
    />
  );
};

export default AnalyticsPage;