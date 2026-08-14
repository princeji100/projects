'use client';

import { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faImages,
  faXmark,
  faCheck,
  faCloudArrowUp,
  faSpinner,
  faMagnifyingGlass,
  faCheckCircle,
} from '@fortawesome/free-solid-svg-icons';
import { getUserUploads } from '@/action/UploadAction';
import { toast } from 'react-toastify';
import SafeImage from '@/components/media/SafeImage';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function MediaLibraryPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Choose from Media Library',
  currentValue = '',
}) {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(currentValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedUrl(currentValue);
      setSearchQuery('');
      fetchUploads();
    }
  }, [isOpen, currentValue]);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const res = await getUserUploads();
      if (res.success) {
        setUploads(res.uploads || []);
      } else {
        toast.error(res.error || 'Failed to load uploads');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      toast.error('File exceeds 4 MB limit');
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
      setSelectedUrl(uploadedUrl);
      toast.success('Uploaded and selected!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const filteredUploads = uploads.filter((u) => {
    const filename = (u.key ? u.key.split('/').pop() : '').toLowerCase();
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return filename.includes(query);
  });

  const handleConfirm = () => {
    if (selectedUrl) {
      onSelect(selectedUrl);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Input */}
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

        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 px-6 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
              <FontAwesomeIcon icon={faImages} />
            </span>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
              <p className="text-xs text-slate-400">Select an uploaded asset or upload a new file</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>

        {/* Control Bar: Search & Quick Upload Button */}
        <div className="p-4 px-6 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
          <div className="relative flex-1">
            <FontAwesomeIcon
              icon={faMagnifyingGlass}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400"
            />
            <input
              type="text"
              placeholder="Search library assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isUploading ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
            ) : (
              <FontAwesomeIcon icon={faCloudArrowUp} className="text-xs" />
            )}
            <span>{isUploading ? 'Uploading...' : 'Upload New'}</span>
          </button>
        </div>

        {/* Media Grid Scroll Area */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[50vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-blue-600" />
              <span className="text-xs font-medium">Loading your media library...</span>
            </div>
          ) : filteredUploads.length === 0 ? (
            <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-2.5">
                <FontAwesomeIcon icon={faImages} className="text-lg" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 mb-1">
                {searchQuery ? 'No matching images found' : 'No images in library'}
              </h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-3">
                {searchQuery
                  ? 'Try searching with a different keyword.'
                  : 'Upload your first image to reuse across your profile anytime.'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Upload an Image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredUploads.map((upload) => {
                const isSelected = selectedUrl === upload.url;
                const filename = upload.key ? upload.key.split('/').pop() : 'Image';

                return (
                  <div
                    key={upload._id}
                    onClick={() => setSelectedUrl(upload.url)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-150 ${
                      isSelected
                        ? 'border-blue-600 ring-4 ring-blue-500/20 scale-98 shadow-md'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <SafeImage
                      src={upload.url}
                      alt={filename}
                      fill
                      className="object-cover"
                      fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-2 text-center">
                          <FontAwesomeIcon icon={faImages} className="text-xl mb-1 text-slate-300" />
                          <span className="text-[9px] text-slate-500 font-mono truncate max-w-full">
                            {filename}
                          </span>
                        </div>
                      }
                    />

                    {/* Selection Indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <FontAwesomeIcon icon={faCheck} className="text-xs" />
                      </div>
                    )}

                    {/* Hover Info Overlay */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2 pt-4 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="truncate font-semibold">{filename}</p>
                      <p className="text-slate-300 text-[9px]">{formatBytes(upload.size)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-medium">
            {selectedUrl ? '1 image selected' : 'Select an image from above'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedUrl}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Apply Selected Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
