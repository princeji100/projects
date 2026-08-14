'use client';

import RadioTogglers from '../formItem/RadioTogglers';
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
import { useState } from 'react';
import upload from '@/lib/upload';
import SectionBox from '../layout/SectionBox';
import { themes, getTheme } from '@/lib/themes';

const PageSettingForm = ({ page, user }) => {
  const [bgType, setBgType] = useState(page?.bgType || 'color');
  const [theme, setTheme] = useState(page?.theme || 'default');
  const [bgColor, setBgColor] = useState(page?.bgColor || '#000000');
  const [bgImage, setBgImage] = useState(page?.bgImage || '');
  const [avatar, setAvatar] = useState(user?.image || '');

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
        toast.success('Saved successfully');
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
    await upload(e, (link) => setter(link));
  };

  const currentPreset = getTheme(theme);

  // Live preview header styling
  let headerStyle = {};
  if (bgType === 'preset') {
    headerStyle = { backgroundColor: currentPreset.headerBg };
  } else if (bgType === 'color') {
    headerStyle = { backgroundColor: bgColor };
  } else if (bgType === 'image' && bgImage) {
    headerStyle = { backgroundImage: `url(${bgImage})` };
  } else {
    headerStyle = { backgroundColor: '#1e293b' };
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SectionBox>
        <form onSubmit={saveBaseSettings} className="space-y-6">
          {/* Header Preview Box */}
          <div
            className="py-4 -m-4 min-h-[300px] flex items-center bg-cover bg-center justify-center rounded-lg transition-all duration-300 relative overflow-hidden"
            style={headerStyle}
          >
            {bgType === 'preset' && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />
            )}

            <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl z-10 max-w-lg w-full mx-4 border border-white/40">
              <RadioTogglers
                defaultValue={bgType}
                options={[
                  { value: 'preset', icon: faPaintBrush, label: 'Preset' },
                  { value: 'color', icon: faPalette, label: 'Color' },
                  { value: 'image', icon: faImage, label: 'Image' },
                ]}
                onChange={setBgType}
              />

              {/* Preset Theme Selection Grid */}
              {bgType === 'preset' && (
                <div className="mt-4">
                  <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Choose Theme Preset:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {themes.map((t) => {
                      const isSelected = theme === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          aria-label={`Select ${t.name} theme`}
                          aria-pressed={isSelected}
                          className={`group relative p-2.5 min-h-[52px] rounded-xl border text-left transition-all duration-200 flex flex-col items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/50 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-full h-8 rounded-lg bg-gradient-to-r ${t.previewGradient} flex items-center justify-center border border-black/10 shadow-inner`}
                          >
                            {isSelected && (
                              <FontAwesomeIcon
                                icon={faCheck}
                                className="text-white drop-shadow-xs text-xs"
                              />
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
                <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center gap-3">
                    <label htmlFor="bg-color-picker" className="text-slate-700 text-sm font-medium">
                      Custom Color:
                    </label>
                    <input
                      id="bg-color-picker"
                      type="color"
                      className="w-12 h-9 rounded cursor-pointer border border-slate-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                      onChange={(e) => setBgColor(e.target.value)}
                      value={bgColor}
                      name="bgColor"
                      aria-label="Pick custom background color"
                    />
                    <span className="text-xs text-slate-500 font-mono">{bgColor}</span>
                  </div>
                </div>
              )}

              {/* Custom Image Upload */}
              {bgType === 'image' && (
                <div className="mt-4">
                  <label className="bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer flex gap-2 items-center justify-center shadow-xs px-4 py-3 min-h-[44px] rounded-xl focus-within:ring-2 focus-within:ring-blue-500">
                    <input type="hidden" name="bgImage" defaultValue={bgImage} />
                    <input
                      type="file"
                      onChange={(e) => handleImageUpload(e, setBgImage)}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Upload custom header banner image"
                    />
                    <FontAwesomeIcon icon={faCloudArrowUp} className="text-blue-500 text-sm" />
                    <span className="text-slate-700 text-sm font-medium">
                      {bgImage ? 'Change Image' : 'Upload Image'}
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Profile Avatar */}
          <div className="flex justify-center -mb-16">
            <div className="relative">
              <div className="bg-white shadow-lg w-32 h-32 rounded-full overflow-hidden ring-4 ring-white">
                <ProfileAvatar src={avatar} size={128} alt="Profile picture" />
              </div>
              <label 
                className="absolute bottom-0 right-0 bg-white hover:bg-slate-50 transition-colors p-2.5 w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full shadow-md cursor-pointer border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500"
                aria-label="Upload profile picture"
              >
                <FontAwesomeIcon icon={faCloudArrowUp} className="text-blue-500 text-sm" />
                <input
                  onChange={(e) => handleImageUpload(e, setAvatar)}
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Upload profile picture"
                />
                <input type="hidden" name="avatar" defaultValue={avatar} />
              </label>
            </div>
          </div>

          {/* User Info Inputs */}
          <div className="space-y-4 pt-8">
            <div>
              <label
                htmlFor="nameIn"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Display Name
              </label>
              <input
                type="text"
                id="nameIn"
                name="displayName"
                spellCheck={false}
                defaultValue={page.displayName}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="locationIn"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Location
              </label>
              <input
                type="text"
                id="locationIn"
                name="location"
                defaultValue={page.location}
                spellCheck={false}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="New York, USA"
              />
            </div>

            <div>
              <label
                htmlFor="bioIn"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Bio
              </label>
              <textarea
                id="bioIn"
                name="bio"
                spellCheck={false}
                defaultValue={page.bio}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-h-[100px]"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="flex justify-center pt-4">
              <SubmitButton className="flex items-center gap-2 px-6 py-2">
                <FontAwesomeIcon icon={faSave} className="text-lg" />
                <span>Save Changes</span>
              </SubmitButton>
            </div>
          </div>
        </form>
      </SectionBox>
    </div>
  );
};

export default PageSettingForm;