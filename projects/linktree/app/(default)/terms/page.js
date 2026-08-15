import Link from 'next/link';
import PolicyLayout from '@/components/compliance/PolicyLayout';
import { COMMERCIAL_IDENTITY, PRICING_DETAILS } from '@/lib/compliance';

export const metadata = {
  title: 'Terms of Service | Prince Links',
  description:
    'Terms of Service and acceptable use agreement for Prince Links, operated by PRINCE under the princeji brand.',
};

export default function TermsPage() {
  return (
    <PolicyLayout
      badge="Legal Agreement"
      title="Terms of Service"
      subtitle="Please read these terms carefully before using Prince Links. By accessing or using our platform, you agree to be bound by these terms."
    >
      <div className="space-y-8 text-slate-700">
        {/* Section 1 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">1. Service &amp; Operator Identity</h2>
          <p>
            {COMMERCIAL_IDENTITY.productName} (&ldquo;the Service&rdquo;, &ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) is a digital creator and link-in-bio platform accessible at{' '}
            <a href={COMMERCIAL_IDENTITY.platformDomain} className="text-blue-600 hover:underline font-semibold">
              {COMMERCIAL_IDENTITY.platformDomain}
            </a>.
          </p>
          <p>
            {COMMERCIAL_IDENTITY.productName} is operated by <strong className="text-slate-900">{COMMERCIAL_IDENTITY.operatorName}</strong> as an individual enterprise under the <strong className="text-slate-900">{COMMERCIAL_IDENTITY.brandName}</strong> brand.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">2. Acceptance of Terms</h2>
          <p>
            By creating an account, claiming a handle, publishing a public creator profile, or accessing any part of {COMMERCIAL_IDENTITY.productName}, you confirm that you have read, understood, and agreed to these Terms of Service and our{' '}
            <Link href="/privacy" className="text-blue-600 hover:underline font-semibold">
              Privacy Policy
            </Link>. If you do not agree to these terms, you must not access or use the Service.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">3. Account Registration &amp; Access Control</h2>
          <p>
            {COMMERCIAL_IDENTITY.productName} operates an invite-only access model. Account registration requires authentication via a verified Google account approved on our platform allowlist.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>You agree to provide accurate and authentic account information.</li>
            <li>You are responsible for safeguarding your Google account credentials and for all activities that occur under your profile.</li>
            <li>We reserve the right to refuse registration or deactivate accounts that do not comply with our platform policies.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">4. Permitted Use &amp; Prohibited Conduct</h2>
          <p>
            You agree to use {COMMERCIAL_IDENTITY.productName} solely for lawful purposes in accordance with these Terms. You must not publish or transmit:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>Phishing links, deceptive redirects, malware, spyware, or malicious scripts.</li>
            <li>Content that infringes upon third-party intellectual property, trademarks, or copyrights.</li>
            <li>Spam, automated abuse, unapproved scraping, or unauthorized promotional campaigns.</li>
            <li>Hate speech, harassment, sexually explicit material, violence, or illegal goods/services.</li>
            <li>Material that attempts to bypass access controls or disrupt platform infrastructure.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">5. User Content &amp; Hosting License</h2>
          <p>
            You retain full ownership of all links, titles, descriptions, avatars, images, and other materials you submit to {COMMERCIAL_IDENTITY.productName} (&ldquo;User Content&rdquo;).
          </p>
          <p>
            By uploading or publishing User Content, you grant {COMMERCIAL_IDENTITY.productName} a worldwide, non-exclusive, royalty-free license strictly necessary to store, format, optimize, and display your content publicly in connection with operating the Service.
          </p>
        </section>

        {/* Section 6 - UPI Tip Jar Distinction */}
        <section className="space-y-2.5 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <h2 className="text-base font-bold text-amber-900">6. Creator UPI Tip Jar &ndash; Important Distinction</h2>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            {COMMERCIAL_IDENTITY.productName} provides a configuration tool enabling creators to optionally publish their personal Unified Payments Interface (UPI) ID on their profile.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-amber-900/80">
            <li>
              <strong>Direct Peer-to-Peer Transfer:</strong> When a visitor initiates a tip, the transaction is processed directly between the visitor&apos;s UPI application and the creator&apos;s personal bank account/VPA.
            </li>
            <li>
              <strong>No Intermediation:</strong> {COMMERCIAL_IDENTITY.productName} does not intermediate, collect, hold, process, or take transaction fees from creator tips.
            </li>
            <li>
              <strong>No Pro Grant:</strong> A tip paid to a creator is NOT a subscription payment to {COMMERCIAL_IDENTITY.productName} and does not grant Pro capabilities.
            </li>
            <li>
              <strong>No Transaction Verification:</strong> {COMMERCIAL_IDENTITY.productName} does not verify, guarantee, or provide refunds for creator tip transactions.
            </li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">7. Free Tier &amp; Paid Pro Subscriptions</h2>
          <p>
            We offer a generous Free tier providing baseline creator capabilities, including profile customization, profile links, themes, media embeds, QR codes, and 30-day analytics.
          </p>
          <p>
            Our optional Pro subscription is available at <strong>{PRICING_DETAILS.pro.price} / month</strong> on a recurring monthly billing basis. Pro grants advanced capabilities such as complete platform branding removal and 90-day / 1-year analytics history.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>There is currently no yearly billing plan or free trial.</li>
            <li>Online billing and subscription fulfillment will be handled through authorized payment gateway partners once payment activation launches.</li>
            <li>Applicable taxes are calculated in accordance with relevant regulations.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">8. Cancellation &amp; Refund Policy</h2>
          <p>
            You may cancel a paid Pro subscription at any time. Detailed cancellation, renewal, and refund terms are governed by our separate{' '}
            <Link href="/refund-policy" className="text-blue-600 hover:underline font-semibold">
              Cancellation &amp; Refund Policy
            </Link>.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">9. Service Availability &amp; Platform Modifications</h2>
          <p>
            We continually improve our platform. We may update, modify, suspend, or discontinue certain features with or without notice. We strive for high availability but do not guarantee uninterrupted or error-free service.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">10. Suspension &amp; Account Termination</h2>
          <p>
            We reserve the right to immediately suspend, restrict, or terminate access to any account or public profile that violates these Terms, poses a security threat, or engages in fraudulent activity.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">11. Limitation of Liability</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            To the maximum extent permitted by applicable law, {COMMERCIAL_IDENTITY.productName} and its operator ({COMMERCIAL_IDENTITY.operatorName}) shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising out of your access to or use of the Service.
          </p>
        </section>

        {/* Section 12 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">12. Contact &amp; Inquiries</h2>
          <p>
            If you have questions regarding these Terms of Service, please contact us at{' '}
            <a href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`} className="text-blue-600 hover:underline font-semibold">
              {COMMERCIAL_IDENTITY.supportEmail}
            </a>.
          </p>
        </section>

        {/* Section 13 - Related Policies */}
        <section className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600">
          <Link href="/pricing" className="hover:text-blue-600 transition">Pricing Plans</Link>
          <Link href="/privacy" className="hover:text-blue-600 transition">Privacy Policy</Link>
          <Link href="/refund-policy" className="hover:text-blue-600 transition">Refunds &amp; Cancellation</Link>
          <Link href="/delivery-policy" className="hover:text-blue-600 transition">Digital Delivery Policy</Link>
          <Link href="/contact" className="hover:text-blue-600 transition">Contact Us</Link>
        </section>
      </div>
    </PolicyLayout>
  );
}
