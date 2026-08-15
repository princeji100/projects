import Link from 'next/link';
import PolicyLayout from '@/components/compliance/PolicyLayout';
import { COMMERCIAL_IDENTITY } from '@/lib/compliance';

export const metadata = {
  title: 'Digital Delivery & Shipping Policy | Prince Links',
  description:
    'Digital service delivery and fulfillment policy for Prince Links SaaS subscriptions. Learn about our instant digital activation process.',
};

export default function DeliveryPolicyPage() {
  return (
    <PolicyLayout
      badge="Fulfillment & Activation"
      title="Digital Delivery & Shipping Policy"
      subtitle="Information regarding the digital fulfillment, provisioning, and activation of Prince Links services."
    >
      <div className="space-y-8 text-slate-700">
        {/* Section 1 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">1. Nature of Digital Service</h2>
          <p>
            {COMMERCIAL_IDENTITY.productName} is a cloud-hosted, web-based digital software application (Software-as-a-Service).
          </p>
          <p>
            We provide digital tools for link curation, custom profile pages, rich media embeds, QR code generation, and analytics reporting.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">2. No Physical Shipping</h2>
          <p>
            Because {COMMERCIAL_IDENTITY.productName} exclusively delivers digital software services:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>No physical goods, packaging, or tangible items are shipped.</strong></li>
            <li>No shipping fees, packaging costs, or courier charges apply to any subscription.</li>
            <li>No postal tracking numbers or physical delivery addresses are required.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">3. Digital Fulfillment &amp; Activation</h2>
          <p>
            Eligible Pro features are digitally activated after successful payment verification. Activation is normally automatic after verification, but technical delays may occasionally occur.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>
              <strong>Digital Entitlement Activation:</strong> Paid Pro capabilities (including platform branding removal and 90-day / 1-year analytics history) are provisioned directly on your verified Prince Links account once transaction verification is confirmed.
            </li>
            <li>
              <strong>Confirmation:</strong> An electronic notification or transaction confirmation will be issued electronically via email or your dashboard overview.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">4. Troubleshooting &amp; Activation Inquiries</h2>
          <p>
            If you encounter any delay in the automatic activation of your Pro features following a verified payment, please reach out immediately to our support team at{' '}
            <a href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`} className="text-blue-600 hover:underline font-semibold">
              {COMMERCIAL_IDENTITY.supportEmail}
            </a>.
          </p>
          <p className="text-xs text-slate-500">
            Please include your registered email and payment confirmation details so we can verify and provision your access right away.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">5. Access &amp; Compliance</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Continued access to digital services remains subject to compliance with our{' '}
            <Link href="/terms" className="text-blue-600 hover:underline font-semibold">
              Terms of Service
            </Link>{' '}
            and acceptable use standards.
          </p>
        </section>

        {/* Section 6 - Related Policy Cross-Links */}
        <section className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
          <Link href="/pricing" className="hover:text-blue-600 transition">Pricing Plans</Link>
          <Link href="/terms" className="hover:text-blue-600 transition">Terms of Service</Link>
          <Link href="/refund-policy" className="hover:text-blue-600 transition">Refunds &amp; Cancellation</Link>
          <Link href="/contact" className="hover:text-blue-600 transition">Contact Support</Link>
        </section>
      </div>
    </PolicyLayout>
  );
}
