'use client';

import {
  faCloudArrowUp,
  faImage,
  faPalette,
  faSave,
  faPaintBrush,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import ProfileAvatar from '@/components/media/ProfileAvatar';
import SubmitButton from '../buttons/SubmitButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SavePageSetting } from '@/action/PageAction';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import upload from '@/lib/upload';
import SectionBox from '../layout/SectionBox';
import { themes, getTheme } from '@/lib/themes';

const PageSettingForm = ({ page, user, onStateChange }) => {
  const [bgType, setBgType] = useState(page?.bgType || 'preset');
  const [theme, setTheme] = useState(page?.theme || 'default');
  const [bgColor, setBgColor] = useState(page?.bgColor || '#000000');
  const [bgImage, setBgImage] = useState(page?.bgImage || '');
  const [avatar, setAvatar] = useState(page?.avatar || user?.image || '');
  const [displayName, setDisplayName] = useState(page?.displayName || user?.name || '');
  const [location, setLocation] = useState(page?.location || '');
  const [bio, setBio] = useState(page?.bio || '');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        bgType,
        theme,
        bgColor,
        bgImage,
        avatar,
        displayName,
        location,
        bio,
      });
    }
  }, [bgType, theme, bgColor, bgImage, avatar, displayName, location, bio, onStateChange]);

  const saveBaseSettings = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('bgType', bgType);
    formData.append('theme', theme);
    formData.append('bgColor', bgColor);
    formData.append('bgImage', bgImage);
    formData.append('avatar', avatar);

    try {
      const result = await SavePageSetting(formData);
      if (result?.success) {
        toast.success('Settings saved successfully');
      } else {
        toast.error(
          result?.retryAfter
            ? `${result.error} (${result.retryAfter}s)`
            : result?.error || 'Failed to save settings'
        );
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred');
    }
  };

  const handleImageUpload = async (e, setter) => {
    setIsUploading(true);
    await upload(e, (link) => {
      setter(link);
      setIsUploading(false);
    });
  };

  return (
    <form onSubmit={saveBaseSettings} className="space-y-6">
      {/* Profile Details Card */}
      <SectionBox title="Profile Details">
        <div className="space-y-5">
          {/* Avatar Upload Block */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-white shadow-sm shrink-0 bg-white">
                <ProfileAvatar src={avatar} size={64} alt={displayName || 'Profile'} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-slate-800 text-sm truncate">{displayName || user?.name || 'Your Name'}</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">@{page?.uri || 'username'}</p>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer focus-within:ring-2 focus-within:ring-blue-500">
              <FontAwesomeIcon icon={faCloudArrowUp} className="text-sm" />
              <span>{isUploading ? 'Uploading...' : 'Upload New Image'}</span>
              <input
                type="file"
                onChange={(e) => handleImageUpload(e, setAvatar)}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Upload new profile image"
              />
              <input type="hidden" name="avatar" value={avatar} />
            </label>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label htmlFor="displayNameInput" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Display Name
              </label>
              <input
                id="displayNameInput"
                type="text"
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Sarah Chen | Artist & Creator"
                spellCheck="false"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white"
              />
            </div>

            <div>
              <label htmlFor="locationInput" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Location
              </label>
              <input
                id="locationInput"
                type="text"
                name="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="New York, USA"
                spellCheck="false"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white"
              />
            </div>
          </div>

          {/* Bio Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="bioInput" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Bio
              </label>
              <span className="text-[11px] text-slate-400 font-mono">{bio.length}/160</span>
            </div>
            <textarea
              id="bioInput"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="Tell us about yourself..."
              spellCheck="false"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white min-h-[90px]"
            />
          </div>
        </div>
      </SectionBox>

      {/* Page Appearance Card */}
      <SectionBox title="Page Appearance">
        <div className="space-y-5">

          {/* Background Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Background Type
            </label>
            <div className="inline-flex w-full bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setBgType('preset')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bgType === 'preset'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faPaintBrush} className="text-xs" />
                <span>Theme Preset</span>
              </button>
              <button
                type="button"
                onClick={() => setBgType('color')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bgType === 'color'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faPalette} className="text-xs" />
                <span>Color</span>
              </button>
              <button
                type="button"
                onClick={() => setBgType('image')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  bgType === 'image'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faImage} className="text-xs" />
                <span>Image</span>
              </button>
            </div>
          </div>

          {/* Preset Theme Swatches */}
          {bgType === 'preset' && (
            <div>
              <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
                Theme Preset Swatches
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {themes.map((t) => {
                  const isSelected = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      aria-label={`Select ${t.name} theme`}
                      aria-pressed={isSelected}
                      className={`group relative p-2 rounded-xl border text-left transition-all duration-200 flex flex-col items-center gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/50 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-full h-12 rounded-lg bg-gradient-to-r ${t.previewGradient} flex items-center justify-center border border-black/10 shadow-xs transition-transform group-hover:scale-102`}
                      >
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                            <FontAwesomeIcon
                              icon={faCheck}
                              className="text-white text-xs drop-shadow-xs"
                            />
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs text-center truncate w-full ${
                          isSelected ? 'text-blue-700 font-bold' : 'text-slate-700 font-medium'
                        }`}
                      >
                        {t.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Color Selector */}
          {bgType === 'color' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
              <label htmlFor="customBgColor" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select Background Color:
              </label>
              <input
                id="customBgColor"
                type="color"
                name="bgColor"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border border-slate-300"
              />
              <span className="text-xs font-mono text-slate-600 font-semibold">{bgColor}</span>
            </div>
          )}

          {/* Custom Image Upload */}
          {bgType === 'image' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Header Background Image:
              </label>
              <label className="bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer flex gap-2 items-center justify-center shadow-xs px-4 py-3 rounded-xl">
                <input type="hidden" name="bgImage" value={bgImage} />
                <input
                  type="file"
                  onChange={(e) => handleImageUpload(e, setBgImage)}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload custom background image"
                />
                <FontAwesomeIcon icon={faCloudArrowUp} className="text-blue-500" />
                <span className="text-slate-700 text-xs font-semibold">
                  {bgImage ? 'Change Image' : 'Upload Background Image'}
                </span>
              </label>
            </div>
          )}
        </div>
      </SectionBox>

      {/* Save Button */}
      <div className="flex justify-center pt-2">
        <SubmitButton className="px-8 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-xs">
          <FontAwesomeIcon icon={faSave} />
          <span>Save Changes</span>
        </SubmitButton>
      </div>
    </form>
  );
};

export default PageSettingForm;