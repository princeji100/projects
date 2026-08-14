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
  faShareNodes,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import SectionBox from '../layout/SectionBox';
import SafeImage from '@/components/media/SafeImage';

const QRCodeCard = ({ uri, publicUrl, user }) => {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  const isSavedProfile = Boolean(uri && publicUrl);

  const handleCopy = async () => {
    if (!isSavedProfile) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success('Profile URL copied to clipboard!');
      setTimeout(() => setCopied(false), 2200);
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
      // Create a high-resolution 1024x1024 canvas for crisp physical scanning
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1024;
      exportCanvas.height = 1024;
      const ctx = exportCanvas.getContext('2d');

      // Fill solid white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 1024);

      // Draw the crisp QR code scaled up smoothly with margin
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 64, 64, 896, 896);

      const imageUri = exportCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUri;
      downloadLink.download = `linktree-${uri}-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('High-Res QR Code (1024x1024) downloaded successfully!');
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
      <SectionBox title="Share Profile">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left py-4">
          <div className="text-slate-400 bg-slate-100 p-4 rounded-2xl">
            <FontAwesomeIcon icon={faQrcode} className="text-3xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Share Profile with QR Code</h3>
            <p className="text-sm text-slate-500 mt-1">{message}</p>
          </div>
        </div>
      </SectionBox>
    );
  }

  return (
    <SectionBox title="Share Profile">
      <div className="space-y-6">
        {/* Header with Title & User Profile Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FontAwesomeIcon icon={faShareNodes} className="text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Share Your Linktree</h3>
              <p className="text-xs text-slate-500">Scan or export your high-resolution QR code</p>
            </div>
          </div>

          {/* User handle badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200/80">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 ring-1 ring-slate-300 shrink-0 flex items-center justify-center">
              <SafeImage
                src={user?.image}
                width={20}
                height={20}
                alt={user?.name || uri}
                className="object-cover w-full h-full"
                fallback={<FontAwesomeIcon icon={faUser} className="text-[10px] text-slate-400" />}
              />
            </div>
            <span className="text-xs font-semibold text-slate-700">@{uri}</span>
          </div>
        </div>

        {/* Content Body: QR Canvas + Action Controls */}
        <div className="flex flex-col md:flex-row items-center gap-8 justify-between bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200/70">
          {/* QR Code Container */}
          <div
            ref={qrRef}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col items-center gap-2 flex-shrink-0 transition-transform hover:scale-102 duration-200"
          >
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              My Linktree QR Code
            </span>
            <QRCodeCanvas
              value={publicUrl}
              size={180}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0f172a"
              marginSize={3}
              className="rounded-xl"
            />
            <span className="text-[11px] font-mono font-medium text-slate-400">/{uri}</span>
          </div>

          {/* Controls & Export Panel */}
          <div className="space-y-4 text-center md:text-left flex-1 w-full">
            {/* Copy URL Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Public Profile URL
              </label>
              <div className="bg-white p-2 sm:p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2 shadow-xs">
                <span className="text-xs font-mono text-slate-700 truncate pl-1">{publicUrl}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    title="Copy URL"
                  >
                    <FontAwesomeIcon icon={copied ? faCheck : faCopy} className={copied ? 'text-emerald-600' : 'text-slate-500'} />
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Open in new tab"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                  </a>
                </div>
              </div>
            </div>

            {/* Download Buttons & Print Helper */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <FontAwesomeIcon icon={faDownload} className="text-sm text-slate-300" />
                <span>Download High-Res PNG (1024×1024)</span>
              </button>

              <p className="text-[11px] text-slate-400">
                Ideal for print (stickers, flyers, business cards) & digital sharing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionBox>
  );
};

export default QRCodeCard;
