import PolicyLayout from '@/components/compliance/PolicyLayout';
import { COMMERCIAL_IDENTITY } from '@/lib/compliance';

export const metadata = {
  title: 'Privacy Policy | Prince Links',
  description:
    'Privacy Policy for Prince Links. Learn how we collect, process, store, and protect your account data, profile content, and analytics.',
};

export default function PrivacyPage() {
  return (
    <PolicyLayout
      badge="Privacy & Transparency"
      title="Privacy Policy"
      subtitle="This Privacy Policy explains what information Prince Links collects, how it is used to deliver the platform, and how your creator data is handled."
    >
      <div className="space-y-8 text-slate-700">
        {/* Section 1 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">1. Overview &amp; Data Controller</h2>
          <p>
            {COMMERCIAL_IDENTITY.productName} is operated by <strong className="text-slate-900">{COMMERCIAL_IDENTITY.operatorName}</strong> under the <strong className="text-slate-900">{COMMERCIAL_IDENTITY.brandName}</strong> brand. We are committed to processing your information transparently and responsibly.
          </p>
          <p>
            This policy applies to all visitors, registered creators, and users of our platform accessible at{' '}
            <a href={COMMERCIAL_IDENTITY.platformDomain} className="text-blue-600 hover:underline font-semibold">
              {COMMERCIAL_IDENTITY.platformDomain}
            </a>.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">2. Information We Collect</h2>
          <p>
            We collect only the information necessary to provide, customize, and secure your {COMMERCIAL_IDENTITY.productName} profile:
          </p>

          <div className="space-y-3 pt-1">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                A. Authentication &amp; Account Information
              </strong>
              <p className="text-xs text-slate-600">
                When you sign in using Google OAuth, we receive your verified Google account email, name, and profile avatar picture. We use this to establish your account identity and verify allowlist authorization.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                B. Profile &amp; Creator Content
              </strong>
              <p className="text-xs text-slate-600">
                You provide custom profile information including your unique handle, display name, bio, location, published links, link badges, scheduling rules, color and theme configurations, and optional UPI ID.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                C. Uploaded Media Files
              </strong>
              <p className="text-xs text-slate-600">
                When you upload profile avatars, custom link icons, or background images, files are stored securely in cloud storage (AWS S3) with total storage quota tracking.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <strong className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                D. First-Party Traffic &amp; Interaction Analytics
              </strong>
              <p className="text-xs text-slate-600">
                When visitors access a public creator profile or click on a published link, we log interaction events containing the event type (page view or link click), target URL, categorical device type (e.g. mobile, desktop, tablet derived from the User-Agent), referrer domain (from the HTTP Referer header), and timestamp. We do not sell analytics data to third-party data brokers.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">3. Cookies &amp; Session Management</h2>
          <p>
            {COMMERCIAL_IDENTITY.productName} utilizes secure, encrypted HTTP-only session cookies strictly required for user authentication and account access via NextAuth.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>We do not utilize cross-site advertising tracking cookies or third-party behavioral ad trackers.</li>
            <li>Session cookies persist authentication state across pages and expire in accordance with standard browser security sessions.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">4. How We Use Information</h2>
          <p>We use collected data solely to:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>Host, format, and deliver your public creator page and link hub.</li>
            <li>Generate real-time analytics reports (views, clicks, device breakdowns, referrer statistics).</li>
            <li>Verify platform invite allowlists and enforce account security.</li>
            <li>Track file upload storage quotas and manage high-resolution QR code generation.</li>
            <li>Provide customer support and respond to user inquiries.</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">5. Data Storage &amp; Third-Party Services</h2>
          <p>
            Our core application infrastructure relies on reputable cloud hosting and storage providers:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>
              <strong>MongoDB Atlas:</strong> Secure cloud database storage for user accounts, page configurations, subscriptions, and first-party event logs.
            </li>
            <li>
              <strong>Amazon Web Services (AWS S3):</strong> Encrypted object storage for uploaded creator profile pictures, icons, and background images.
            </li>
            <li>
              <strong>Google OAuth:</strong> Identity verification during sign-in.
            </li>
          </ul>
        </section>

        {/* Section 6 - Prospective Payment Boundary */}
        <section className="space-y-2.5 p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
          <h2 className="text-base font-bold text-blue-900">6. Payment Processing &amp; Billing Boundary</h2>
          <p className="text-xs text-blue-900/90 leading-relaxed">
            Online paid checkout for Pro subscriptions is currently in technical preparation. When paid billing is activated:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs text-blue-900/80">
            <li>Payment transactions will be processed directly through authorized payment gateway partners (such as Razorpay).</li>
            <li>{COMMERCIAL_IDENTITY.productName} will NOT collect, handle, or store complete credit/debit card numbers or bank credentials.</li>
            <li>We retain only non-sensitive subscription references (such as subscription status, provider customer ID, and active billing period) necessary to provision Pro entitlements.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">7. Data Retention &amp; Preservation</h2>
          <p>
            Account details, profile content, and uploaded media are retained for as long as your account remains active on the platform.
          </p>
          <p>
            Analytics event records are preserved in our database to ensure that continuous 90-day and 365-day trend reporting is immediately available when an account upgrades to Pro. If you choose to delete your profile or request account removal, your associated profile data is removed from active platform databases.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">8. Security &amp; Data Rights</h2>
          <p>
            We implement industry-standard organizational and technical safeguards to protect your information against unauthorized access, alteration, or disclosure. However, no internet transmission is 100% immune to risk.
          </p>
          <p>
            You have the right to access, update, or request the deletion of your personal account information at any time.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900">9. Privacy Inquiries &amp; Contact</h2>
          <p>
            If you have questions, data requests, or privacy concerns, please contact our team at{' '}
            <a href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`} className="text-blue-600 hover:underline font-semibold">
              {COMMERCIAL_IDENTITY.supportEmail}
            </a>.
          </p>
        </section>
      </div>
    </PolicyLayout>
  );
}
