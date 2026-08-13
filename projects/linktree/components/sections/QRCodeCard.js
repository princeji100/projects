'use client';

import { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode,
  faDownload,
  faCopy,
  faExternalLinkAlt,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import SectionBox from '../layout/SectionBox';

const QRCodeCard = ({ page }) => {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const qrRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const publicUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
      setOrigin(publicUrl.replace(/\/$/, ''));
    }
  }, []);

  const uri = page?.uri || '';
  const profileUrl = uri && origin ? `${origin}/${uri}` : '';

  const handleCopy = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      toast.success('Profile URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownload = () => {
    if (!profileUrl) return;
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('Unable to generate QR image');
      return;
    }

    // High resolution canvas export
    const imageUri = canvas.toDataURL('image/png');
    const downloadLink = document.createElement('a');
    downloadLink.href = imageUri;
    downloadLink.download = `linktree-${uri || 'profile'}-qr.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    toast.success('QR Code downloaded as PNG');
  };

  if (!uri) {
    return (
      <SectionBox>
        <div className="flex items-center gap-3 mb-2">
          <div className="text-blue-600 bg-blue-50 p-2.5 rounded-lg">
            <FontAwesomeIcon icon={faQrcode} className="text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Share with QR Code</h2>
            <p className="text-xs text-slate-500">
              Claim your username first to generate your custom profile QR code
            </p>
          </div>
        </div>
      </SectionBox>
    );
  }

  return (
    <SectionBox>
      <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
        {/* Info & URL */}
        <div className="space-y-4 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="text-blue-600 bg-blue-50 p-2.5 rounded-xl">
              <FontAwesomeIcon icon={faQrcode} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Share Profile</h2>
              <p className="text-xs text-slate-500">
                Scan or download your personalized QR code to share your links in the physical world
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3 max-w-md">
            <span className="text-xs font-mono text-slate-700 truncate">{profileUrl}</span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded hover:bg-slate-200 transition-colors"
                title="Copy URL"
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-green-600' : ''} />
              </button>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-slate-600 hover:text-blue-600 p-1.5 rounded hover:bg-slate-200 transition-colors"
                title="Open in new tab"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm active:scale-95"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium transition-all"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-green-600' : ''} />
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* QR Code Canvas */}
        <div
          ref={qrRef}
          className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center gap-2 flex-shrink-0"
        >
          <QRCodeCanvas
            value={profileUrl || 'https://example.com'}
            size={180}
            level="H"
            includeMargin={true}
            className="rounded-lg"
          />
          <span className="text-[11px] font-medium text-slate-400">/{uri}</span>
        </div>
      </div>
    </SectionBox>
  );
};

export default QRCodeCard;
