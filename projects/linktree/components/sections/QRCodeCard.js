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
      // Create a high-resolution 1024x1024 canvas for crisp physical printing
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1024;
      exportCanvas.height = 1024;
      const ctx = exportCanvas.getContext('2d');

      // Fill solid white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1024, 1024);

      // Draw the crisp QR code scaled up smoothly with quiet zone
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(canvas, 64, 64, 896, 896);

      const imageUri = exportCanvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUri;
      downloadLink.download = `linktree-${uri}-qr-1024x1024.png`;
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

  // Domain display formatting for pill (e.g. linktree.com/username or current domain)
  const displayDomainUrl = publicUrl.replace(/^https?:\/\//, '');

  return (
    <SectionBox title="Share Profile">
      {/* Floating QR Card matching docs/screenshots/qr-card.png */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs max-w-lg mx-auto space-y-6">
        {/* Card Header: Title + Share Icon + User Badge */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
              Share Your Linktree
            </h3>
            <FontAwesomeIcon icon={faShareNodes} className="text-slate-400 text-sm" />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 transition-colors">
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

        {/* Center QR Box Container */}
        <div
          ref={qrRef}
          className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 flex flex-col items-center gap-4 shadow-2xs transition-all hover:border-slate-300"
        >
          <span className="text-xs font-semibold text-slate-600 tracking-wide">
            My Linktree QR Code
          </span>

          {/* High-Resolution QR Canvas with Excavated Center Brand Logo */}
          <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center">
            <QRCodeCanvas
              value={publicUrl}
              size={210}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#0f172a"
              marginSize={3}
              className="rounded-lg"
              imageSettings={{
                src: '/icon.svg',
                height: 44,
                width: 44,
                excavate: true,
              }}
            />
          </div>
        </div>

        {/* 2-Column Action Controls matching qr-card.png */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Left: Download High-Res PNG Button */}
          <button
            type="button"
            onClick={handleDownload}
            className="group bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl p-3.5 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <FontAwesomeIcon icon={faDownload} className="text-lg text-slate-300 group-hover:translate-y-0.5 transition-transform" />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight">Download High-Res PNG</span>
              <span className="text-[10px] text-slate-400 font-mono leading-tight">(1024×1024)</span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Print • SVG • PNG</span>
            </div>
          </button>

          {/* Right: URL Pill + Copy URL Button */}
          <div className="flex flex-col justify-between gap-2">
            <div className="bg-slate-100/80 hover:bg-slate-100 px-3 py-2 rounded-xl text-[11px] font-mono text-slate-600 border border-slate-200/70 truncate text-center select-all transition-colors">
              {displayDomainUrl}
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="bg-white hover:bg-slate-50 active:scale-95 border-2 border-slate-900 text-slate-900 rounded-2xl py-2.5 px-4 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <FontAwesomeIcon
                icon={copied ? faCheck : faCopy}
                className={copied ? 'text-emerald-600' : 'text-slate-700'}
              />
              <span>{copied ? 'Copied!' : 'Copy URL'}</span>
            </button>
          </div>
        </div>

        {/* Footer Helper Text */}
        <p className="text-center text-[11px] text-slate-400 font-medium pt-1">
          Ideal for print & digital use
        </p>
      </div>
    </SectionBox>
  );
};

export default QRCodeCard;
