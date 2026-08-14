'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
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
} from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { deleteUpload } from '@/action/UploadAction';
import SectionBox from '@/components/layout/SectionBox';
import SafeImage from '@/components/media/SafeImage';

const MAX_QUOTA_BYTES = 25 * 1024 * 1024; // 25 MB

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function UploadsManagerClient({ initialUploads = [], activeReferences = {} }) {
  const [uploads, setUploads] = useState(initialUploads);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isPending, startTransition] = useTransition();

  const totalUsedBytes = uploads.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const usagePercentage = Math.min(100, Math.round((totalUsedBytes / MAX_QUOTA_BYTES) * 100));

  // Determine progress bar color based on quota usage
  let progressBarColor = 'bg-blue-600';
  if (usagePercentage > 90) {
    progressBarColor = 'bg-red-500';
  } else if (usagePercentage > 70) {
    progressBarColor = 'bg-amber-500';
  }

  const handleDeleteClick = (upload) => {
    // Get referenced locations for this specific upload
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
        setPendingDelete(null);
      } else {
        toast.error(res.error || 'Failed to delete upload');
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Storage Quota Meter */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <FontAwesomeIcon icon={faHardDrive} className="text-xl" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Storage & Uploads</h1>
            <p className="text-sm text-slate-500">
              Manage your uploaded images and track your storage allocation
            </p>
          </div>
        </div>

        {/* Quota Progress Meter (D-11) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 font-medium text-slate-700">
              <span>Storage Quota</span>
              <span className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600 font-semibold">
                {usagePercentage}% used
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              <span className="font-semibold text-slate-800">{formatBytes(totalUsedBytes)}</span> /{' '}
              {formatBytes(MAX_QUOTA_BYTES)}
            </div>
          </div>

          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
              style={{ width: `${Math.max(2, usagePercentage)}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-400">
            <span>{uploads.length} files stored</span>
            <span>{formatBytes(Math.max(0, MAX_QUOTA_BYTES - totalUsedBytes))} remaining</span>
          </div>
        </div>
      </div>

      {/* Uploads Gallery Grid */}
      <SectionBox>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Uploaded Media</h2>
            <p className="text-xs text-slate-500">
              Images uploaded for profile avatars, backgrounds, or link icons
            </p>
          </div>
        </div>

        {uploads.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <FontAwesomeIcon icon={faImages} className="text-lg" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">No uploads yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload images from your page settings to see them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {uploads.map((upload) => {
              const refs = activeReferences[upload.url] || [];
              const isInUse = refs.length > 0;
              const filename = upload.key ? upload.key.split('/').pop() : 'Image';

              return (
                <div
                  key={upload._id}
                  className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  {/* Thumbnail Preview */}
                  <div className="relative aspect-square bg-slate-100 overflow-hidden">
                    <SafeImage
                      src={upload.url}
                      alt={filename}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-200"
                      fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-3 text-center">
                          <FontAwesomeIcon icon={faImages} className="text-3xl mb-1.5 text-slate-300" />
                          <span className="text-[10px] text-slate-500 font-mono truncate max-w-full px-1">
                            {filename}
                          </span>
                        </div>
                      }
                    />

                    {/* In-Use Badge */}
                    {isInUse && (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                          <FontAwesomeIcon icon={faCheckCircle} className="text-[9px]" />
                          In Use
                        </span>
                      </div>
                    )}

                    {/* Quick Link Overlay */}
                    <a
                      href={upload.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 p-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-80 sm:opacity-0 group-hover:opacity-100 transition text-xs focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white"
                      title="Open full image"
                      aria-label={`Open ${filename} in new tab`}
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} />
                    </a>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="p-3.5 flex-grow flex flex-col justify-between space-y-3 bg-white">
                    <div>
                      <p
                        className="text-xs font-semibold text-slate-800 truncate"
                        title={filename}
                      >
                        {filename}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
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

                      {/* Reference tag description */}
                      {isInUse && (
                        <p className="text-[10px] text-blue-600 bg-blue-50/80 px-2 py-1 rounded-md mt-2 line-clamp-1">
                          {refs.join(', ')}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(upload)}
                      aria-label={`Delete upload ${filename}`}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 py-2.5 min-h-[40px] rounded-xl transition focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none cursor-pointer active:scale-95"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-[11px]" />
                      <span>Delete Upload</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionBox>

      {/* Safety Deletion Modal (D-15, D-16) */}
      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <span
                className={`p-2.5 rounded-xl ${
                  pendingDelete.inUse ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }`}
              >
                <FontAwesomeIcon icon={faTriangleExclamation} className="text-lg" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900">
                  {pendingDelete.inUse ? 'Active Image in Use' : 'Confirm Deletion'}
                </h3>
                
                {/* Visual Preview Box */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 my-3">
                  <div className="relative w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                    <SafeImage
                      src={pendingDelete.upload.url}
                      alt={pendingDelete.upload.key ? pendingDelete.upload.key.split('/').pop() : 'Upload preview'}
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
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {pendingDelete.upload.key ? pendingDelete.upload.key.split('/').pop() : 'Image'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatBytes(pendingDelete.upload.size)}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-slate-600">
                  {pendingDelete.inUse ? (
                    <>
                      <p className="mb-1">
                        Are you sure? This image is currently in use as:{' '}
                        <span className="font-semibold text-slate-800">
                          {pendingDelete.references.join(', ')}
                        </span>
                        .
                      </p>
                      <span className="text-xs text-amber-700 mt-2 block font-medium bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                        Deleting this file will remove it from AWS S3, release{' '}
                        {formatBytes(pendingDelete.upload.size)}, and automatically clear the
                        reference on your public profile.
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

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-xl transition cursor-pointer disabled:opacity-50 shadow-sm shadow-red-500/20"
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
