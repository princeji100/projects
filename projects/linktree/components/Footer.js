import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faGlobe } from '@fortawesome/free-solid-svg-icons';
import LinktreeLogo from './media/LinktreeLogo';
import { COMMERCIAL_IDENTITY } from '@/lib/compliance';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        {/* Main Grid: Brand Column + 3 Navigation Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          
          {/* Brand & Overview */}
          <div className="space-y-3 sm:col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-block hover:opacity-85 transition-opacity focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-0.5"
            >
              <LinktreeLogo boxSize="w-6 h-6" iconSize="text-[10px]" textSize="text-sm" />
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
              Fast, customizable creator profile hubs, link curation, rich media embeds, and first-party analytics.
            </p>
          </div>

          {/* Product Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/pricing"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/terms"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/refund-policy"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  Refunds &amp; Cancellation
                </Link>
              </li>
              <li>
                <Link
                  href="/delivery-policy"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  Digital Delivery Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Support Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Support</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/contact"
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${COMMERCIAL_IDENTITY.supportEmail}`}
                  className="text-slate-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 rounded-md py-1 inline-block"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="text-slate-400 text-[11px]" />
                  <span>{COMMERCIAL_IDENTITY.supportEmail}</span>
                </a>
              </li>
              <li className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                <FontAwesomeIcon icon={faGlobe} className="text-slate-300 text-[10px]" />
                <span>{COMMERCIAL_IDENTITY.platformHost}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Commercial & Copyright Bar */}
        <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>
              {COMMERCIAL_IDENTITY.productName} is a digital service operated by{' '}
              <strong className="text-slate-700 font-bold">{COMMERCIAL_IDENTITY.operatorName}</strong> under the{' '}
              <strong className="text-slate-700 font-bold">{COMMERCIAL_IDENTITY.brandName}</strong> brand.
            </span>
          </div>
          <div>
            <span>&copy; {new Date().getFullYear()} {COMMERCIAL_IDENTITY.productName}. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
