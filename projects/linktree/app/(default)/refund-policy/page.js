import Link from 'next/link';
import PolicyLayout from '@/components/compliance/PolicyLayout';
import { COMMERCIAL_IDENTITY, PRICING_DETAILS } from '@/lib/compliance';

export const metadata = {
  title: 'Cancellation & Refund Policy | Prince Links',
  description:
    'Cancellation and refund terms for Prince Links SaaS subscriptions. Learn how cancellations, renewals, and refunds are handled.',
};

export default function RefundPolicyPage() {
  return (
    <PolicyLayout
      badge="Billing & Cancellation"
      title="Cancellation & Refund Policy"
      subtitle="Clear and fair terms governing your Prince Links subscription cancellations and refund requests."
    >
      <div className="space-y-8 text-slate-700">
        {/* Section 1 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">1. Subscription Overview</h2>
          <p>
            {COMMERCIAL_IDENTITY.productName} offers an optional Pro subscription billed on a monthly recurring basis at <strong>{PRICING_DETAILS.pro.price} / month</strong>.
          </p>
          <p>
            The subscription provides digital access to advanced capabilities, including white-label profile branding removal and 90-day / 1-year analytics history.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">2. Subscription Cancellation</h2>
          <p>
            You may choose to cancel your paid Pro subscription at any time. When you cancel:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>Automatic recurring billing will be stopped, preventing future renewal charges.</li>
            <li>
              <strong>Continued Access:</strong> You will retain full access to all Pro features until the conclusion of your current paid billing period.
            </li>
            <li>
              At the end of the paid period, your account will automatically transition to the baseline Free tier without loss of core links or profile data.
            </li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">3. Current Cancellation Support Process</h2>
          <p>
            While self-service automated billing management is being finalized for full public launch, subscription cancellation and billing management requests can be submitted directly by emailing our support team at{' '}
            <a href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`} className="text-blue-600 hover:underline font-semibold">
              {COMMERCIAL_IDENTITY.supportEmail}
            </a>.
          </p>
          <p className="text-xs text-slate-500">
            Please include your registered Google email address and handle. Cancellation requests are processed promptly upon receipt.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">4. Refund Policy</h2>
          <p>
            Because {COMMERCIAL_IDENTITY.productName} is a digital SaaS service with immediate feature activation upon payment, started billing cycles are generally non-refundable once the billing period has commenced.
          </p>
          <p>We evaluate refund requests on a case-by-case basis under the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>
              <strong>Duplicate Billing:</strong> Accidental duplicate charges resulting from technical gateway errors.
            </li>
            <li>
              <strong>Verified Technical Errors:</strong> Confirmed technical failures that prevented the activation of paid Pro features during the billing cycle.
            </li>
            <li>
              <strong>Statutory Requirements:</strong> Where refunds are required by applicable consumer protection laws.
            </li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">5. Refund Processing Time</h2>
          <p>
            Approved refunds are returned through the original payment method and provider. The time required for the funds to reflect in your account depends on the payment gateway, issuing bank, or financial institution.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <h2 className="text-base font-bold text-slate-900">6. Creator UPI Tip Jar Payments (Non-SaaS)</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tips sent by profile visitors directly to a creator&apos;s personal UPI VPA via the optional Tip Jar feature are direct peer-to-peer transfers between third parties. {COMMERCIAL_IDENTITY.productName} does not collect or hold these funds and cannot issue refunds for creator tips.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">7. Contact for Billing Support</h2>
          <p>
            For any billing, cancellation, or refund inquiries, please email us directly at{' '}
            <a href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`} className="text-blue-600 hover:underline font-semibold">
              {COMMERCIAL_IDENTITY.supportEmail}
            </a>.
          </p>
        </section>

        {/* Section 8 - Related Policies */}
        <section className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
          <Link href="/pricing" className="hover:text-blue-600 transition">Pricing Plans</Link>
          <Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link>
          <Link href="/delivery-policy" className="hover:text-blue-600 transition">Digital Delivery Policy</Link>
          <Link href="/contact" className="hover:text-blue-600 transition">Contact Us</Link>
        </section>
      </div>
    </PolicyLayout>
  );
}
