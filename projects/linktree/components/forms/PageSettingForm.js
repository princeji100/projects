'use client'
import RadioTogglers from "../formItem/RadioTogglers"
import { faCloudArrowUp, faImage, faPalette, faSave } from "@fortawesome/free-solid-svg-icons"
import Image from "next/image";
import SubmitButton from "../buttons/SubmitButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SavePageSetting } from "@/action/PageAction";
import { toast } from "react-toastify";
import { useState } from "react";
import upload from "@/lib/upload";
import SectionBox from "../layout/SectionBox";

const PageSettingForm = ({ page, user }) => {
  const [bgType, setBgType] = useState(page.bgType);
  const [bgColor, setBgColor] = useState(page.bgColor);
  const [bgImage, setBgImage] = useState(page.bgImage);
  const [avatar, setAvatar] = useState(user?.image);

  const saveBaseSettings = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    formData.append('bgType', bgType);
    formData.append('bgColor', bgColor);
    formData.append('bgImage', bgImage);
    formData.append('avatar', avatar);
    
    try {
      const result = await SavePageSetting(formData);
      if (result) {
        toast.success('Settings saved successfully', {
          position: "top-right",
          autoClose: 3000,
          theme: "light",
        });
      }
    } catch (error) {
      toast.error('Failed to save settings');
    }
  }

  const handleImageUpload = async (e, setter, errorMessage) => {
    try {
      await upload(e, link => setter(link));
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <SectionBox>
        <form onSubmit={saveBaseSettings} className="space-y-6">
          <div 
            className="py-4 -m-4 min-h-[300px] flex items-center bg-cover bg-center justify-center rounded-lg transition-all duration-300" 
            style={bgType === 'color' ? { backgroundColor: bgColor } : { backgroundImage: `url(${bgImage})` }}
          >
            <div className="bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
              <RadioTogglers
                defaultValue={bgType}
                options={[
                  { value: 'color', icon: faPalette, label: 'Color' },
                  { value: 'image', icon: faImage, label: 'Image' }
                ]}
                onChange={setBgType}
              />
              
              {bgType === 'color' && (
                <div className="mt-4 bg-white rounded-lg shadow-sm p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-700 font-medium">Background:</span>
                    <input
                      type="color"
                      className="w-12 h-8 rounded cursor-pointer"
                      onChange={e => setBgColor(e.target.value)}
                      value={bgColor}
                      name="bgColor"
                    />
                  </div>
                </div>
              )}

              {bgType === 'image' && (
                <div className="mt-4">
                  <label className="bg-white hover:bg-slate-50 transition-colors cursor-pointer flex gap-2 items-center shadow-sm px-4 py-2 rounded-lg" >
                    <input type="hidden" name="bgImage" defaultValue={bgImage} />
                    <input 
                      type="file" 
                      onChange={e => handleImageUpload(e, setBgImage, 'Failed to upload cover image')} 
                      className="hidden" 
                      accept="image/*"
                    />
                    <FontAwesomeIcon icon={faCloudArrowUp} className="text-blue-500" />
                    <span className="text-slate-700">Change Image</span>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center -mb-16">
            <div className="relative">
              <div className="bg-white shadow-lg w-32 h-32 rounded-full overflow-hidden">
                <Image 
                  className="rounded-full object-cover" 
                  src={avatar} 
                  width={128} 
                  height={128} 
                  alt="Profile picture" 
                />
              </div>
              <label className="absolute bottom-0 right-0 bg-white hover:bg-slate-50 transition-colors p-2 rounded-full shadow-md cursor-pointer">
                <FontAwesomeIcon icon={faCloudArrowUp} className="text-blue-500" />
                <input 
                  onChange={e => handleImageUpload(e, setAvatar, 'Failed to upload avatar')} 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                />
                <input type="hidden" name="avatar" defaultValue={avatar} />
              </label>
            </div>
          </div>

          <div className="space-y-4 pt-8">
            <div>
              <label htmlFor="nameIn" className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
              <input 
                type="text" 
                id="nameIn" 
                name="displayName" 
                spellCheck={false}
                data-ms-editor="true"
                defaultValue={page.displayName} 
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="John Doe" 
              />
            </div>

            <div>
              <label htmlFor="locationIn" className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input 
                type="text" 
                id="locationIn" 
                name="location" 
                defaultValue={page.location} 
                spellCheck={false}
                data-ms-editor="true"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="New York, USA" 
              />
            </div>

            <div>
              <label htmlFor="bioIn" className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
              <textarea 
                id="bioIn" 
                name="bio"
                spellCheck={false}
                data-ms-editor="true" 
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
  )
}

export default PageSettingForm