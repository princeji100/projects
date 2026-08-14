'use client';

import { useState, useRef } from 'react';
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

const QRCodeCard = ({ uri, publicUrl }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const isSavedProfile = Boolean(uri && publicUrl);

  const handleCopy = async () => {
    if (!isSavedProfile) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Profile URL copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleDownload = () => {
    if (!isSavedProfile) {
      toast.error('Save your profile username before downloading the QR code');
      return;
    }

    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('Unable to generate QR image');
      return;
    }

    try {
      // Create a high-resolution 1024x1024 canvas for crisp physical scanning with quiet zone
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1024;
      exportCanvas.height = 1024;
      const ctx = exportCanvas.getContext('2d');

      // Fill solid white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 1024);

      // Draw the crisp QR code scaled up smoothly
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 64, 64, 896, 896);

      const imageUri = exportCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUri;
      downloadLink.download = `linktree-${uri}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('QR Code downloaded as high-res PNG');
    } catch (err) {
      console.error('QR download error:', err);
      toast.error('Failed to download QR image');
    }
  };

  if (!isSavedProfile) {
    const message = !uri
      ? 'Claim and save your unique username above to generate your verified public QR code.'
      : 'Canonical site URL is not configured (missing NEXT_PUBLIC_URL). Configure your site URL to generate scannable profile QR codes.';

    return (
      <SectionBox>
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="text-slate-400 bg-slate-100 p-3.5 rounded-xl">
            <FontAwesomeIcon icon={faQrcode} className="text-2xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Share Profile with QR Code</h2>
            <p className="text-sm text-slate-500 mt-0.5">{message}</p>
          </div>
        </div>
      </SectionBox>
    );
  }

  return (
    <SectionBox>
      <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
        {/* Info & Canonical URL */}
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

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3 max-w-md">
            <span className="text-xs font-mono text-slate-700 truncate">{publicUrl}</span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs font-medium text-slate-600 hover:text-blue-600 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
                title="Copy URL"
                aria-label="Copy public profile URL"
              >
                <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-green-600' : ''} />
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-slate-600 hover:text-blue-600 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                title="Open in new tab"
                aria-label="Open public profile in a new browser tab"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-sm font-semibold transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-2 px-5 py-2.5 min-h-[44px] border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 rounded-xl text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-green-600' : ''} />
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
        </div>

        {/* QR Code Canvas with High Contrast & Quiet Zone */}
        <div
          ref={qrRef}
          className="bg-white p-4 rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center gap-2 flex-shrink-0"
        >
          <QRCodeCanvas
            value={publicUrl}
            size={180}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
            marginSize={4}
            className="rounded-lg"
          />
          <span className="text-[11px] font-medium text-slate-400">/{uri}</span>
        </div>
      </div>
    </SectionBox>
  );
};

export default QRCodeCard;
