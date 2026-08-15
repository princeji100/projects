'use client';

import { useState, useRef } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode,
  faDownload,
  faCopy,
  faExternalLinkAlt,
  faCheck,
  faShareNodes,
  faUser,
  faFileCode,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import SectionBox from '../layout/SectionBox';
import SafeImage from '@/components/media/SafeImage';

const QRCodeCard = ({ uri, publicUrl, user }) => {
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);
  const highResCanvasRef = useRef(null);
  const svgRef = useRef(null);

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

  const handleNativeShare = async () => {
    if (!isSavedProfile) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: `${user?.name || uri}'s Prince Links`,
          text: `Check out my links and profile on Prince Links!`,
          url: publicUrl,
        });
        toast.success('Shared successfully!');
      } else {
        await handleCopy();
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        await handleCopy();
      }
    }
  };

  const handleDownloadPng = () => {
    if (!isSavedProfile) {
      toast.error('Save your profile username before downloading the QR code');
      return;
    }

    const canvas = highResCanvasRef.current?.querySelector('canvas');
    if (!canvas) {
      toast.error('Unable to generate high-resolution QR image');
      return;
    }

    try {
      const imageUri = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = imageUri;
      downloadLink.download = `linktree-${uri}-qr-1024x1024.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      toast.success('Ultra High-Res QR Code (1024×1024) downloaded!');
    } catch (err) {
      console.error('QR download error:', err);
      toast.error('Failed to download QR image');
    }
  };

  const handleDownloadSvg = () => {
    if (!isSavedProfile) {
      toast.error('Save your profile username before downloading the QR code');
      return;
    }

    const svgElement = svgRef.current?.querySelector('svg');
    if (!svgElement) {
      toast.error('Unable to generate vector SVG');
      return;
    }

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `linktree-${uri}-qr-vector.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(svgUrl);
      toast.success('Vector SVG QR Code downloaded!');
    } catch (err) {
      console.error('SVG download error:', err);
      toast.error('Failed to download SVG QR image');
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

  // Domain display formatting for pill
  const displayDomainUrl = publicUrl.replace(/^https?:\/\//, '');

  return (
    <SectionBox title="Share Profile">
      {/* Floating QR Card matching docs/screenshots/qr-card.png */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-7 shadow-xs max-w-lg mx-auto space-y-6">
        
        {/* Card Header: Title + Interactive Share Button + User Badge */}
        <div className="flex items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
              Share Your Prince Links Profile
            </h3>
            <button
              type="button"
              onClick={handleNativeShare}
              title="Share profile link"
              aria-label="Share profile link"
              className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-colors cursor-pointer active:scale-90"
            >
              <FontAwesomeIcon icon={faShareNodes} className="text-xs" />
            </button>
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
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 flex flex-col items-center gap-4 shadow-2xs transition-all hover:border-slate-300">
          <span className="text-xs font-semibold text-slate-600 tracking-wide">
            My Linktree QR Code
          </span>

          {/* On-Screen Crisp QR Canvas with Center Excavated Logo */}
          <div className="p-2.5 bg-white rounded-2xl shadow-xs border border-slate-100 flex items-center justify-center">
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

        {/* Hidden Native 1024×1024 Ultra High-Res Canvas for Crystal Sharp Export */}
        <div ref={highResCanvasRef} className="hidden" aria-hidden="true">
          <QRCodeCanvas
            value={publicUrl}
            size={1024}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#0f172a"
            marginSize={4}
            imageSettings={{
              src: '/icon.svg',
              height: 220,
              width: 220,
              excavate: true,
            }}
          />
        </div>

        {/* Hidden Native Vector SVG for Infinite Scale Export */}
        <div ref={svgRef} className="hidden" aria-hidden="true">
          <QRCodeSVG
            value={publicUrl}
            size={1024}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#0f172a"
            marginSize={4}
            imageSettings={{
              src: '/icon.svg',
              height: 220,
              width: 220,
              excavate: true,
            }}
          />
        </div>

        {/* 2-Column Action Controls matching qr-card.png */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Left: Download High-Res PNG Button */}
          <button
            type="button"
            onClick={handleDownloadPng}
            className="group bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-2xl p-3.5 flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <FontAwesomeIcon
              icon={faDownload}
              className="text-lg text-slate-300 group-hover:translate-y-0.5 transition-transform"
            />
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold leading-tight">Download High-Res PNG</span>
              <span className="text-[10px] text-slate-400 font-mono leading-tight">(1024×1024 HD)</span>
              <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Print Ready</span>
            </div>
          </button>

          {/* Right: URL Pill + Copy URL Button */}
          <div className="flex flex-col justify-between gap-2">
            <div className="bg-slate-100/80 hover:bg-slate-100 px-3 py-2 rounded-xl text-[11px] font-mono text-slate-600 border border-slate-200/70 truncate text-center select-all transition-colors">
              {displayDomainUrl}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 bg-white hover:bg-slate-50 active:scale-95 border-2 border-slate-900 text-slate-900 rounded-2xl py-2.5 px-3 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <FontAwesomeIcon
                  icon={copied ? faCheck : faCopy}
                  className={copied ? 'text-emerald-600' : 'text-slate-700'}
                />
                <span>{copied ? 'Copied!' : 'Copy URL'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSvg}
                title="Download Vector SVG"
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-semibold flex items-center justify-center transition-all cursor-pointer"
              >
                SVG
              </button>
            </div>
          </div>
        </div>

        {/* Footer Helper Text */}
        <p className="text-center text-[11px] text-slate-400 font-medium pt-1">
          Ideal for print (merchandise, stickers, flyers) & digital use
        </p>
      </div>
    </SectionBox>
  );
};

export default QRCodeCard;
