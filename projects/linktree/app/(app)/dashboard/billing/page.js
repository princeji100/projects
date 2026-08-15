import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectToDatabase from '@/lib/connectToDB';
import Page from '@/models/Page';
import { getSubscriptionByUserId } from '@/lib/subscriptionRepository';
import { getSafeUserEntitlements } from '@/lib/featureAccess';
import { formatBillingPresentation } from '@/lib/billingPresentation';
import BillingClient from '@/components/billing/BillingClient';
import UserNameForm from '@/components/forms/UserNameForm';

export const metadata = {
  title: 'Billing & Plans | Linktree',
  description: 'Manage your Linktree subscription, current tier, and Pro capabilities',
};

const BillingPage = async () => {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/');
  }

  await connectToDatabase();
  const page = await Page.findOne({ owner: session.user.email });

  if (!page) {
    return (
      <div className="max-w-xl mx-auto mt-8">
        <UserNameForm />
      </div>
    );
  }

  // Resolve subscription and entitlements strictly on session.user.id
  let subscription = null;
  try {
    subscription = await getSubscriptionByUserId(session.user.id);
  } catch {
    // Fail-closed to null subscription on database errors
    subscription = null;
  }

  const entitlements = await getSafeUserEntitlements(session.user.id);
  const presentation = formatBillingPresentation(entitlements, subscription);

  return <BillingClient presentation={presentation} />;
};

export default BillingPage;
