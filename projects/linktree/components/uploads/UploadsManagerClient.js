'use client';

import { useState, useTransition, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImages,
  faTrash,
  faHardDrive,
  faSpinner,
  faTriangleExclamation,
  faClock,
  faCheckCircle,
  faExternalLinkAlt,
  faCloudArrowUp,
  faCopy,
  faCheck,
  faEye,
  faMagnifyingGlass,
  faFilter,
  faXmark,
  faLayerGroup,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { deleteUpload } from '@/action/UploadAction';
import SectionBox from '@/components/layout/SectionBox';
import SafeImage from '@/components/media/SafeImage';

const MAX_QUOTA_BYTES = 25 * 1024 * 1024; // 25 MB

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function UploadsManagerClient({ initialUploads = [], activeReferences = {} }) {
  const [uploads, setUploads] = useState(initialUploads);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'in-use' | 'avatars' | 'backgrounds' | 'unused'
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);

  const totalUsedBytes = uploads.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const usagePercentage = Math.min(100, Math.round((totalUsedBytes / MAX_QUOTA_BYTES) * 100));

  // Determine progress bar color based on quota usage
  let progressBarColor = 'from-blue-600 via-indigo-600 to-violet-600';
  if (usagePercentage > 90) {
    progressBarColor = 'from-amber-500 to-red-600';
  } else if (usagePercentage > 75) {
    progressBarColor = 'from-blue-500 to-amber-500';
  }

  // Upload handler
  const handleFileUpload = async (file) => {
    if (!file) return;

    // Validate size (< 4 MB)
    if (file.size > 4 * 1024 * 1024) {
      toast.error('File exceeds 4 MB limit');
      return;
    }

    // Validate quota
    if (totalUsedBytes + file.size > MAX_QUOTA_BYTES) {
      toast.error('Storage quota exceeded (25 MB cap). Delete some files first.');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.set('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }

      const uploadedUrl = await res.json();
      const newUpload = {
        _id: String(Date.now()),
        key: uploadedUrl.split('/').pop() || file.name,
        size: file.size,
        url: uploadedUrl,
        createdAt: new Date().toISOString(),
      };

      setUploads((prev) => [newUpload, ...prev]);
      toast.success('Media asset uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyLink = async (upload) => {
    try {
      await navigator.clipboard.writeText(upload.url);
      setCopiedId(upload._id);
      toast.success('Image CDN URL copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleDeleteClick = (upload) => {
    const refs = activeReferences[upload.url] || [];
    setPendingDelete({
      upload,
      inUse: refs.length > 0,
      references: refs,
    });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete?.upload) return;
    const uploadId = pendingDelete.upload._id;

    startTransition(async () => {
      const res = await deleteUpload(uploadId);
      if (res.success) {
        toast.success(res.message);
        setUploads((prev) => prev.filter((u) => u._id !== uploadId));
        if (previewImage?._id === uploadId) setPreviewImage(null);
        setPendingDelete(null);
      } else {
        toast.error(res.error || 'Failed to delete upload');
      }
    });
  };

  // Drag and drop events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Filter calculations
  const inUseCount = uploads.filter((u) => (activeReferences[u.url] || []).length > 0).length;
  const avatarCount = uploads.filter((u) => (activeReferences[u.url] || []).some(r => r.includes('Avatar'))).length;
  const bgCount = uploads.filter((u) => (activeReferences[u.url] || []).some(r => r.includes('Background'))).length;
  const unusedCount = uploads.length - inUseCount;

  const filteredUploads = uploads.filter((u) => {
    const refs = activeReferences[u.url] || [];
    const isInUse = refs.length > 0;
    const filename = (u.key ? u.key.split('/').pop() : '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();

    // Query search match
    if (query && !filename.includes(query) && !refs.some(r => r.toLowerCase().includes(query))) {
      return false;
    }

    // Filter tab match
    if (activeFilter === 'in-use') return isInUse;
    if (activeFilter === 'avatars') return refs.some(r => r.includes('Avatar'));
    if (activeFilter === 'backgrounds') return refs.some(r => r.includes('Background'));
    if (activeFilter === 'unused') return !isInUse;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Direct Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }}
      />

      {/* ═══ Header Info & Storage Quota Meter ═══ */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl shadow-xs border border-slate-200/90 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl shadow-xs shrink-0">
              <FontAwesomeIcon icon={faHardDrive} />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Storage & Uploads</h1>
              <p className="text-sm text-slate-500">
                Manage your media assets, check active page usage, and monitor your cloud storage.
              </p>
            </div>
          </div>

          {/* Direct Upload CTA Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isUploading ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-sm" />
            ) : (
              <FontAwesomeIcon icon={faCloudArrowUp} className="text-sm" />
            )}
            <span>{isUploading ? 'Uploading...' : 'Upload New Media'}</span>
          </button>
        </div>

        {/* Modern Cloud Quota Progress Meter */}
        <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2.5 font-bold text-slate-800">
              <span>Storage Quota</span>
              <span className="text-[11px] bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-full text-slate-700 font-semibold shadow-2xs">
                {usagePercentage}% used
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              <span className="font-bold text-slate-900">{formatBytes(totalUsedBytes)}</span> /{' '}
              {formatBytes(MAX_QUOTA_BYTES)}
            </div>
          </div>

          {/* Gradient Progress Bar */}
          <div className="w-full h-3.5 bg-slate-200/90 rounded-full overflow-hidden p-0.5 shadow-inner">
            <div
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${progressBarColor}`}
              style={{ width: `${Math.max(3, usagePercentage)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faLayerGroup} className="text-slate-400 text-[10px]" />
              {uploads.length} files stored ({inUseCount} active in profile)
            </span>
            <span className="font-semibold text-slate-600">
              {formatBytes(Math.max(0, MAX_QUOTA_BYTES - totalUsedBytes))} available
            </span>
          </div>
        </div>
      </div>

      {/* ═══ Drag & Drop Quick Dropzone ═══ */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/80 scale-101 shadow-md'
            : 'border-slate-300/80 bg-white/70 hover:bg-blue-50/30 hover:border-blue-400 shadow-2xs'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl bg-blue-50 group-hover:bg-blue-100/80 text-blue-600 flex items-center justify-center transition-colors">
          <FontAwesomeIcon icon={faCloudArrowUp} className="text-xl group-hover:scale-110 transition-transform" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            Drag & drop images here, or <span className="text-blue-600 underline">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Supports PNG, JPG, or WEBP up to 4 MB (Auto-optimized for CDN)
          </p>
        </div>
      </div>

      {/* ═══ Uploads Gallery & Filter System ═══ */}
      <SectionBox>
        {/* Top Control Bar: Search & Filter Tabs */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Uploaded Media Gallery</h2>
              <p className="text-xs text-slate-500">
                Click any image to view in high resolution, copy CDN link, or manage file.
              </p>
            </div>

            {/* Live Search Input */}
            <div className="relative w-full md:w-64">
              <FontAwesomeIcon
                icon={faMagnifyingGlass}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"
              />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs select-none">
            {[
              { id: 'all', label: `All Files (${uploads.length})` },
              { id: 'in-use', label: `In Use (${inUseCount})` },
              { id: 'avatars', label: `Avatars (${avatarCount})` },
              { id: 'backgrounds', label: `Backgrounds (${bgCount})` },
              { id: 'unused', label: `Unused (${unusedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        {filteredUploads.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FontAwesomeIcon icon={faImages} className="text-2xl" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              {searchQuery ? 'No matching assets found' : 'No uploads yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {searchQuery
                ? `No images matched "${searchQuery}". Try a different search term.`
                : 'Upload images from your page settings or drag & drop files here.'}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredUploads.map((upload) => {
              const refs = activeReferences[upload.url] || [];
              const isInUse = refs.length > 0;
              const isAvatar = refs.some(r => r.includes('Avatar'));
              const isBackground = refs.some(r => r.includes('Background'));
              const isLinkIcon = refs.some(r => r.includes('Link'));
              const filename = upload.key ? upload.key.split('/').pop() : 'Image';
              const isCopied = copiedId === upload._id;

              return (
                <div
                  key={upload._id}
                  className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col hover:border-slate-300"
                >
                  {/* Thumbnail Container with Hover Controls */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden cursor-pointer">
                    <SafeImage
                      src={upload.url}
                      alt={filename}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-3 text-center">
                          <FontAwesomeIcon icon={faImages} className="text-3xl mb-1.5 text-slate-300" />
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-full px-1">
                            {filename}
                          </span>
                        </div>
                      }
                    />

                    {/* Status Pill Badge (Top Left) */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1">
                      {isAvatar && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-xs">
                          <FontAwesomeIcon icon={faCircleCheck} className="text-[8px]" />
                          Avatar
                        </span>
                      )}
                      {isBackground && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-600 text-white px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-xs">
                          <FontAwesomeIcon icon={faCircleCheck} className="text-[8px]" />
                          Background
                        </span>
                      )}
                      {isLinkIcon && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-blue-600 text-white px-2.5 py-0.5 rounded-full shadow-md backdrop-blur-xs">
                          <FontAwesomeIcon icon={faCircleCheck} className="text-[8px]" />
                          Link Icon
                        </span>
                      )}
                      {!isInUse && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-slate-900/70 text-slate-200 px-2 py-0.5 rounded-full backdrop-blur-xs">
                          Unassigned
                        </span>
                      )}
                    </div>

                    {/* Interactive Floating Quick Actions Overlay */}
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 p-4">
                      {/* Fullscreen Lightbox Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(upload);
                        }}
                        title="View Full Resolution"
                        className="w-10 h-10 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105 cursor-pointer"
                      >
                        <FontAwesomeIcon icon={faEye} className="text-sm" />
                      </button>

                      {/* Copy CDN Link Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(upload);
                        }}
                        title="Copy CDN Link"
                        className="w-10 h-10 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105 cursor-pointer"
                      >
                        <FontAwesomeIcon
                          icon={isCopied ? faCheck : faCopy}
                          className={`text-sm ${isCopied ? 'text-emerald-600' : 'text-slate-800'}`}
                        />
                      </button>

                      {/* Open in New Tab Button */}
                      <a
                        href={upload.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in new tab"
                        className="w-10 h-10 rounded-xl bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:scale-105"
                      >
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs" />
                      </a>
                    </div>
                  </div>

                  {/* Metadata & Actions Footer */}
                  <div className="p-3.5 flex-grow flex flex-col justify-between space-y-3 bg-white">
                    <div>
                      <p
                        className="text-xs font-bold text-slate-800 truncate"
                        title={filename}
                      >
                        {filename}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mt-1">
                        <span>{formatBytes(upload.size || 0)}</span>
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                          {upload.createdAt
                            ? new Date(upload.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })
                            : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Action Row: Delete & Copy */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(upload)}
                        aria-label={`Delete upload ${filename}`}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 py-2 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer active:scale-95"
                      >
                        <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                        <span>Delete</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(upload)}
                        title="Copy CDN Link"
                        className="px-3 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer active:scale-95"
                      >
                        <FontAwesomeIcon
                          icon={isCopied ? faCheck : faCopy}
                          className={isCopied ? 'text-emerald-600' : ''}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionBox>

      {/* ═══ High-Resolution Lightbox Modal ═══ */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100">
              <div className="min-w-0 flex-1 pr-4">
                <h3 className="font-bold text-slate-900 text-sm truncate">
                  {previewImage.key ? previewImage.key.split('/').pop() : 'Media Preview'}
                </h3>
                <p className="text-xs text-slate-400">
                  {formatBytes(previewImage.size)} • Uploaded {new Date(previewImage.createdAt || Date.now()).toLocaleDateString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faXmark} className="text-sm" />
              </button>
            </div>

            {/* Modal Image View */}
            <div className="relative w-full max-h-[60vh] h-96 bg-slate-950 flex items-center justify-center overflow-hidden">
              <SafeImage
                src={previewImage.url}
                alt="Full Preview"
                fill
                className="object-contain"
              />
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 px-6 bg-slate-50 flex items-center justify-between gap-3">
              <div className="text-xs text-slate-500 truncate font-mono max-w-xs">
                {previewImage.url}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyLink(previewImage)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <FontAwesomeIcon icon={faCopy} />
                  <span>Copy CDN URL</span>
                </button>
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition text-xs"
                  title="Open Original"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Safety Deletion Modal (D-15, D-16) ═══ */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5">
              <span
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-lg ${
                  pendingDelete.inUse ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }`}
              >
                <FontAwesomeIcon icon={faTriangleExclamation} />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {pendingDelete.inUse ? 'Active Media in Use' : 'Delete Uploaded Media?'}
                </h3>
                
                {/* Visual Thumbnail Preview */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 my-3.5">
                  <div className="relative w-14 h-14 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                    <SafeImage
                      src={pendingDelete.upload.url}
                      alt="Thumbnail"
                      fill
                      className="object-cover"
                      fallback={
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <FontAwesomeIcon icon={faImages} className="text-sm" />
                        </div>
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {pendingDelete.upload.key ? pendingDelete.upload.key.split('/').pop() : 'Image'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {formatBytes(pendingDelete.upload.size)}
                    </p>
                  </div>
                </div>

                <div className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {pendingDelete.inUse ? (
                    <>
                      <p className="mb-2">
                        This image is currently active as:{' '}
                        <span className="font-bold text-slate-900">
                          {pendingDelete.references.join(', ')}
                        </span>
                        .
                      </p>
                      <span className="text-xs text-amber-800 block font-medium bg-amber-50 p-3 rounded-xl border border-amber-200/80">
                        Deleting this file will delete it from AWS S3, release{' '}
                        <strong>{formatBytes(pendingDelete.upload.size)}</strong>, and safely clear the reference on your profile.
                      </span>
                    </>
                  ) : (
                    <>
                      <p>
                        Are you sure you want to permanently delete this upload?
                      </p>
                      <span className="text-xs text-slate-500 mt-1 block">
                        File will be deleted from cloud storage and {formatBytes(pendingDelete.upload.size)} will be freed.
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 mt-6 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isPending}
                className="px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md shadow-red-600/20 active:scale-95"
              >
                {isPending && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                <span>Delete Upload</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
