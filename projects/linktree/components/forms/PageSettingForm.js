'use client';

import {
  faCloudArrowUp,
  faImage,
  faPalette,
  faSave,
  faPaintBrush,
  faCheck,
  faLocationDot,
  faUser,
  faRotateLeft,
  faWandMagicSparkles,
  faFont,
  faEye,
  faImages,
} from '@fortawesome/free-solid-svg-icons';
import ProfileAvatar from '@/components/media/ProfileAvatar';
import SubmitButton from '../buttons/SubmitButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SavePageSetting } from '@/action/PageAction';
import { toast } from 'react-toastify';
import { useState, useEffect } from 'react';
import upload from '@/lib/upload';
import SectionBox from '../layout/SectionBox';
import { themes } from '@/lib/themes';
import { fonts } from '@/lib/fonts';
import MediaLibraryPickerModal from '@/components/media/MediaLibraryPickerModal';

const gradientPresets = [
  { name: 'Sunset', from: '#f43f5e', to: '#fb923c' },
  { name: 'Ocean', from: '#0284c7', to: '#38bdf8' },
  { name: 'Cyber', from: '#ec4899', to: '#8b5cf6' },
  { name: 'Neon', from: '#10b981', to: '#06b6d4' },
  { name: 'Midnight', from: '#0f172a', to: '#581c87' },
  { name: 'Royal', from: '#4f46e5', to: '#c026d3' },
  { name: 'Emerald', from: '#065f46', to: '#10b981' },
  { name: 'Amber Glow', from: '#d97706', to: '#dc2626' },
];

const PageSettingForm = ({ page, user, onStateChange }) => {
  const [bgType, setBgType] = useState(page?.bgType || 'preset');
  const [theme, setTheme] = useState(page?.theme || 'default');
  const [font, setFont] = useState(page?.font || 'default');
  const [bgColor, setBgColor] = useState(page?.bgColor || '#000000');
  const [bgGradientFrom, setBgGradientFrom] = useState(page?.bgGradientFrom || '#3b82f6');
  const [bgGradientTo, setBgGradientTo] = useState(page?.bgGradientTo || '#9333ea');
  const [bgGradientDirection, setBgGradientDirection] = useState(page?.bgGradientDirection || '180deg');
  const [bgImage, setBgImage] = useState(page?.bgImage || '');
  const [bgImageOverlay, setBgImageOverlay] = useState(page?.bgImageOverlay ?? true);
  const [textColor, setTextColor] = useState(page?.textColor || '');
  const [avatar, setAvatar] = useState(page?.avatar || user?.image || '');
  const [displayName, setDisplayName] = useState(page?.displayName || '');
  const [location, setLocation] = useState(page?.location || '');
  const [bio, setBio] = useState(page?.bio || '');
  const [isUploading, setIsUploading] = useState(false);
  const [pickerConfig, setPickerConfig] = useState({ isOpen: false, title: '', target: null });

  // Tip Jar Configuration State
  const [tipJarEnabled, setTipJarEnabled] = useState(Boolean(page?.tipJar?.enabled));
  const [tipJarUpiId, setTipJarUpiId] = useState(page?.tipJar?.upiId || '');
  const [tipJarName, setTipJarName] = useState(page?.tipJar?.name || '');
  const [tipJarAmount, setTipJarAmount] = useState(page?.tipJar?.amount || '');
  const [tipJarMessage, setTipJarMessage] = useState(page?.tipJar?.message || '');

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        bgType,
        theme,
        font,
        bgColor,
        bgGradientFrom,
        bgGradientTo,
        bgGradientDirection,
        bgImage,
        bgImageOverlay,
        textColor,
        avatar,
        displayName,
        location,
        bio,
        tipJar: {
          enabled: tipJarEnabled,
          upiId: tipJarUpiId,
          name: tipJarName,
          amount: tipJarAmount,
          message: tipJarMessage,
        },
      });
    }
  }, [
    bgType,
    theme,
    font,
    bgColor,
    bgGradientFrom,
    bgGradientTo,
    bgGradientDirection,
    bgImage,
    bgImageOverlay,
    textColor,
    avatar,
    displayName,
    location,
    bio,
    tipJarEnabled,
    tipJarUpiId,
    tipJarName,
    tipJarAmount,
    tipJarMessage,
    onStateChange,
  ]);

  const saveBaseSettings = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      formData.set('bgType', bgType);
      formData.set('theme', theme);
      formData.set('font', font);
      formData.set('bgColor', bgColor);
      formData.set('bgGradientFrom', bgGradientFrom);
      formData.set('bgGradientTo', bgGradientTo);
      formData.set('bgGradientDirection', bgGradientDirection);
      formData.set('bgImage', bgImage);
      formData.set('bgImageOverlay', String(bgImageOverlay));
      formData.set('textColor', textColor);
      formData.set('avatar', avatar);

      // Tip Jar explicit values
      formData.set('tipJarEnabled', String(tipJarEnabled));
      formData.set('tipJarUpiId', tipJarUpiId);
      formData.set('tipJarName', tipJarName);
      formData.set('tipJarAmount', tipJarAmount);
      formData.set('tipJarMessage', tipJarMessage);

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

  // Check which top-level category is active
  const isColorCategory = bgType === 'color' || bgType === 'gradient';

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

            <div className="flex flex-wrap items-center gap-2">
              {avatar && avatar !== user?.image && (
                <button
                  type="button"
                  onClick={() => setAvatar(user?.image || '')}
                  title="Reset to Google profile photo"
                  className="p-2.5 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs text-xs font-medium transition-colors cursor-pointer"
                >
                  <FontAwesomeIcon icon={faRotateLeft} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setPickerConfig({ isOpen: true, title: 'Choose Profile Avatar', target: 'avatar' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <FontAwesomeIcon icon={faImages} className="text-xs text-blue-600" />
                <span>Choose from Library</span>
              </button>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer focus-within:ring-2 focus-within:ring-blue-500">
                <FontAwesomeIcon icon={faCloudArrowUp} className="text-xs" />
                <span>{isUploading ? 'Uploading...' : 'Upload New'}</span>
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
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label htmlFor="displayNameInput" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <FontAwesomeIcon icon={faUser} className="text-[10px] text-slate-400" />
                <span>Display Name</span>
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
              <label htmlFor="locationInput" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <FontAwesomeIcon icon={faLocationDot} className="text-[10px] text-slate-400" />
                <span>Location</span>
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
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors ${
                  bio.length >= 150
                    ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                    : 'bg-slate-100 text-slate-500 font-medium'
                }`}
              >
                {bio.length}/160
              </span>
            </div>
            <textarea
              id="bioInput"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="Tell visitors about yourself or your work..."
              spellCheck="false"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white min-h-[90px]"
            />
          </div>
        </div>
      </SectionBox>

      {/* Page Appearance Card */}
      <SectionBox title="Page Appearance">
        <div className="space-y-6">

          {/* Top-Level Background Type Switcher: 3 Categories */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Background Type
            </label>
            <div className="inline-flex w-full bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setBgType('preset')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                onClick={() => setBgType(bgType === 'gradient' ? 'gradient' : 'color')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isColorCategory
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FontAwesomeIcon icon={faPalette} className="text-xs" />
                <span>Custom Color</span>
              </button>

              <button
                type="button"
                onClick={() => setBgType('image')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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
                Curated Theme Presets
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

          {/* Custom Color Section (With Solid vs Gradient Sub-Tabs) */}
          {isColorCategory && (
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              {/* Solid vs Gradient Sub-Toggle */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Color Mode:
                </span>
                <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setBgType('color')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      bgType === 'color'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Solid Color
                  </button>
                  <button
                    type="button"
                    onClick={() => setBgType('gradient')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                      bgType === 'gradient'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[10px]" />
                    <span>Gradient</span>
                  </button>
                </div>
              </div>

              {/* 1. Solid Color Selector */}
              {bgType === 'color' && (
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <label htmlFor="customBgColor" className="text-xs font-semibold text-slate-700">
                    Select Background Color:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="customBgColor"
                      type="color"
                      name="bgColor"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-10 h-9 rounded-lg cursor-pointer border border-slate-300"
                    />
                    <span className="text-xs font-mono text-slate-700 font-semibold">{bgColor}</span>
                  </div>
                </div>
              )}

              {/* 2. Gradient Builder */}
              {bgType === 'gradient' && (
                <div className="space-y-4 pt-1">
                  {/* Quick Gradient Presets */}
                  <div>
                    <span className="block text-[11px] font-medium text-slate-500 mb-2">
                      Quick Gradient Starters:
                    </span>
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {gradientPresets.map((gp) => (
                        <button
                          key={gp.name}
                          type="button"
                          onClick={() => {
                            setBgGradientFrom(gp.from);
                            setBgGradientTo(gp.to);
                          }}
                          title={gp.name}
                          style={{
                            background: `linear-gradient(135deg, ${gp.from}, ${gp.to})`,
                          }}
                          className="h-8 rounded-lg border border-black/10 shadow-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>

                  {/* Color Pickers & Direction Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <label htmlFor="gradientStart" className="text-xs font-medium text-slate-600">
                        Start Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="gradientStart"
                          type="color"
                          name="bgGradientFrom"
                          value={bgGradientFrom}
                          onChange={(e) => setBgGradientFrom(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                        />
                        <span className="text-xs font-mono font-semibold text-slate-700">{bgGradientFrom}</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <label htmlFor="gradientEnd" className="text-xs font-medium text-slate-600">
                        End Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="gradientEnd"
                          type="color"
                          name="bgGradientTo"
                          value={bgGradientTo}
                          onChange={(e) => setBgGradientTo(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300"
                        />
                        <span className="text-xs font-mono font-semibold text-slate-700">{bgGradientTo}</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <label htmlFor="gradientDirection" className="text-xs font-medium text-slate-600">
                        Direction
                      </label>
                      <select
                        id="gradientDirection"
                        name="bgGradientDirection"
                        value={bgGradientDirection}
                        onChange={(e) => setBgGradientDirection(e.target.value)}
                        className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 cursor-pointer focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="180deg">Vertical ↓</option>
                        <option value="90deg">Horizontal →</option>
                        <option value="135deg">Diagonal ↘</option>
                        <option value="45deg">Diagonal ↗</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom Image Upload */}
          {bgType === 'image' && (
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Header Background Image:
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPickerConfig({ isOpen: true, title: 'Choose Background Image', target: 'bgImage' })}
                  className="bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer flex gap-2 items-center justify-center shadow-xs px-4 py-3 rounded-xl active:scale-95 text-slate-700 text-xs font-semibold"
                >
                  <FontAwesomeIcon icon={faImages} className="text-blue-600" />
                  <span>Choose from Library</span>
                </button>

                <label className="bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer flex gap-2 items-center justify-center shadow-xs px-4 py-3 rounded-xl active:scale-95 text-xs font-semibold focus-within:ring-2 focus-within:ring-blue-500">
                  <input type="hidden" name="bgImage" value={bgImage} />
                  <input
                    type="file"
                    onChange={(e) => handleImageUpload(e, setBgImage)}
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Upload custom background image"
                  />
                  <FontAwesomeIcon icon={faCloudArrowUp} className="text-white" />
                  <span>
                    {isUploading ? 'Uploading...' : bgImage ? 'Upload New Image' : 'Upload Image'}
                  </span>
                </label>
              </div>

              {/* Image Contrast Overlay Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faEye} className="text-xs text-slate-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">Dark Contrast Overlay</span>
                    <p className="text-[11px] text-slate-500">Darkens photo slightly for crystal clear text readability</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={bgImageOverlay}
                  onChange={(e) => setBgImageOverlay(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Text Color & Readability Control */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faFont} className="text-xs text-slate-500" />
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Text & Content Color
              </label>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Ensure your name, bio, and links are clearly readable on any background.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTextColor('')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  textColor === ''
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>Theme Default</span>
              </button>

              <button
                type="button"
                onClick={() => setTextColor('#ffffff')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  textColor === '#ffffff'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300 shadow-2xs" />
                <span>Light Text (White)</span>
              </button>

              <button
                type="button"
                onClick={() => setTextColor('#0f172a')}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  textColor === '#0f172a'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="w-3.5 h-3.5 rounded-full bg-slate-900 shadow-2xs" />
                <span>Dark Text (Black)</span>
              </button>
            </div>

            {/* Custom Hex Color Picker if needed */}
            <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">Custom Text Color:</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor || '#ffffff'}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border border-slate-300"
                />
                <span className="text-xs font-mono font-semibold text-slate-700">
                  {textColor || 'Auto'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </SectionBox>

      {/* Typography & Fonts Card */}
      <SectionBox title="Typography & Fonts">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Profile Font Family
            </span>
            <span className="text-xs text-slate-500 font-medium">
              10+ Curated Google Fonts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {fonts.map((f) => {
              const isSelected = font === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  aria-label={`Select ${f.name} font`}
                  aria-pressed={isSelected}
                  className={`p-3 rounded-2xl border text-left transition-all duration-150 flex flex-col justify-between gap-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none cursor-pointer ${
                    isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/60 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-900 truncate">
                      {f.name}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] shrink-0">
                        <FontAwesomeIcon icon={faCheck} className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <p
                    style={{
                      fontFamily: f.fontFamily && f.fontFamily !== 'inherit' ? f.fontFamily : undefined,
                    }}
                    className={`text-sm text-slate-700 font-medium truncate ${f.className}`}
                  >
                    Aa Bb Gg 123
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span className="truncate">{f.description}</span>
                    <span className="uppercase text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-semibold shrink-0 ml-1">
                      {f.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SectionBox>

      {/* Support / Tip Jar (UPI) Card */}
      <SectionBox title="Support / Tip Jar (UPI)">
        <div className="space-y-5">
          {/* Header & Enable Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <div className="space-y-0.5 pr-4">
              <label
                htmlFor="tipjar-toggle"
                className="text-sm font-bold text-slate-900 cursor-pointer select-none flex items-center gap-1.5"
              >
                <span>Enable Tip Jar</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                  Zero Fee UPI
                </span>
              </label>
              <p className="text-xs text-slate-500">
                Allow visitors to send appreciation tips directly to your UPI ID via QR or UPI apps.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer min-h-[44px] px-1 shrink-0">
              <input
                id="tipjar-toggle"
                type="checkbox"
                checked={tipJarEnabled}
                onChange={(e) => setTipJarEnabled(e.target.checked)}
                className="sr-only peer"
                aria-label="Toggle Tip Jar on public profile"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[12px] after:left-[6px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Explanatory Disclaimer Note */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-xl text-xs text-amber-800 flex items-start gap-2">
            <span className="text-sm shrink-0 mt-0.5" aria-hidden="true">ℹ️</span>
            <p>
              Visitors will be able to open their UPI app or scan a QR code. This app does not verify whether a payment was completed.
            </p>
          </div>

          {/* Form Fields with Progressive Disclosure */}
          <div
            className={`space-y-4 transition-all duration-200 ${
              tipJarEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none select-none'
            }`}
          >
            {/* UPI ID Field */}
            <div>
              <label
                htmlFor="tipJarUpiId"
                className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider"
              >
                UPI ID / VPA {tipJarEnabled && <span className="text-rose-500">*</span>}
              </label>
              <input
                id="tipJarUpiId"
                type="text"
                value={tipJarUpiId}
                onChange={(e) => setTipJarUpiId(e.target.value)}
                disabled={!tipJarEnabled}
                placeholder="e.g. creator@upi"
                autoComplete="off"
                spellCheck="false"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your Google Pay, PhonePe, Paytm, BHIM, or any bank UPI ID (e.g. yourname@okhdfcbank).
              </p>
            </div>

            {/* Display / Payee Name & Suggested Amount Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tipJarName"
                  className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider"
                >
                  Payee / Display Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="tipJarName"
                  type="text"
                  value={tipJarName}
                  onChange={(e) => setTipJarName(e.target.value)}
                  disabled={!tipJarEnabled}
                  placeholder="e.g. Prince"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white"
                />
              </div>

              <div>
                <label
                  htmlFor="tipJarAmount"
                  className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider"
                >
                  Suggested Amount (₹) <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                    ₹
                  </span>
                  <input
                    id="tipJarAmount"
                    type="text"
                    inputMode="decimal"
                    value={tipJarAmount}
                    onChange={(e) => setTipJarAmount(e.target.value)}
                    disabled={!tipJarEnabled}
                    placeholder="100"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Payment Note / Message Field */}
            <div>
              <label
                htmlFor="tipJarMessage"
                className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider"
              >
                Payment Note / Message <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="tipJarMessage"
                type="text"
                value={tipJarMessage}
                onChange={(e) => setTipJarMessage(e.target.value)}
                disabled={!tipJarEnabled}
                placeholder="e.g. Buy me a chai!"
                maxLength={200}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A brief message shown to supporters when initiating payment.
              </p>
            </div>
          </div>
        </div>
      </SectionBox>

      {/* Save Button */}
      <div className="flex justify-center pt-2">
        <SubmitButton className="px-8 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-xs">
          <FontAwesomeIcon icon={faSave} />
          <span>Save Changes</span>
        </SubmitButton>
      </div>

      {/* Media Library Picker Modal */}
      <MediaLibraryPickerModal
        isOpen={pickerConfig.isOpen}
        title={pickerConfig.title}
        currentValue={pickerConfig.target === 'avatar' ? avatar : bgImage}
        onClose={() => setPickerConfig({ isOpen: false, title: '', target: null })}
        onSelect={(selectedUrl) => {
          if (pickerConfig.target === 'avatar') {
            setAvatar(selectedUrl);
          } else if (pickerConfig.target === 'bgImage') {
            setBgImage(selectedUrl);
          }
        }}
      />
    </form>
  );
};

export default PageSettingForm;