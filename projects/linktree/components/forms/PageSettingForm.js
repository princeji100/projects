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
    formData.append('bgType', bgType);  // Add bgType to formData
    formData.append('bgColor', bgColor);  // Add bgColor to formData
    formData.append('bgImage', bgImage);  // Add bgImage to formData
    formData.append('avatar', avatar);  // Add avatar to formData
    const result = await SavePageSetting(formData);
    if (result) {
      toast.success('Saved Successfully', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
    }
  }

  const handelCoverImageChange = async (e) => {
    try {
      await upload(e, link => {
        setBgImage(link);
      });
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error('Failed to upload cover image');
    }
  }

  const handleAvatarImageChange = async (e) => {
    try {
      await upload(e, link => {
        setAvatar(link);
      });
    } catch (error) {
      console.error('Error uploading avatar image:', error);
      toast.error('Failed to upload avatar image');
    }
  }

  return (
    <div>
      <SectionBox>
        <form onSubmit={saveBaseSettings}>
          <div className="py-4 -m-4 min-h-[300px] flex items-center bg-cover bg-center justify-center" style={
            bgType === 'color' ? { backgroundColor: bgColor } : { backgroundImage: `url(${bgImage})` }
          }>
            <div>
              <RadioTogglers
                defaultValue={bgType}
                options={[
                  { value: 'color', icon: faPalette, label: 'Color' },
                  { value: 'image', icon: faImage, label: 'Image' }
                ]}
                onChange={(e) => setBgType(e)}
              />
              {bgType === 'color' && (
                <div className="bg-gray-200 shadow text-gray-700 py-1 mt-2">
                  <div className="mt-2 flex justify-center items-center">
                    <span>Background Color : </span>
                    <input
                      type="color"
                      className="cursor-pointer"
                      onChange={e => setBgColor(e.target.value)}
                      value={bgColor}
                      name="bgColor"
                    />
                  </div>
                </div>
              )}
              {bgType === 'image' && (
                <div className="mt-2 flex justify-center">
                  <label className="cursor-pointer bg-white flex gap-2 items-center shadow px-4 py-2" >
                    <input type="hidden" name="bgImage" defaultValue={bgImage} />
                    <input type="file" onChange={handelCoverImageChange} className="hidden" />
                    <FontAwesomeIcon icon={faCloudArrowUp} />
                    <span>
                      Change Image
                    </span>
                  </label>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-center -mb-13">
            <div className="bg-black shadow shadow-black/50 w-[128px] h-[128px] flex rounded-full relative -top-10">
              <Image className="rounded-full" src={avatar} width={128} height={128} alt="avatar" />
              <label htmlFor="avatarIn" className="absolute flex items-center text-[18px] bottom-3 -right-1 bg-white px-2 rounded-full shadow shadow-black/50 cursor-pointer aspect-square">
                <FontAwesomeIcon icon={faCloudArrowUp} />
                <input onChange={handleAvatarImageChange} id="avatarIn" type="file" className="hidden" />
                <input type="hidden" name="avatar" defaultValue={avatar} />
              </label>  
            </div>
          </div>
          <div className="form">
            <label htmlFor="nameIn">Display name</label>
            <input type="text" id="nameIn" name="displayName" defaultValue={page.displayName} spellCheck="false" data-ms-editor="true" placeholder="Prince Jain" />
            <label htmlFor="locationIn">Location</label>
            <input type="text" name="location" defaultValue={page.location} id="locationIn" spellCheck="false" data-ms-editor="true" placeholder="New Delhi" />
            <label htmlFor="bioIn">Bio</label>
            <textarea name="bio" id="bioIn" defaultValue={page.bio} spellCheck="false" data-ms-editor="true" placeholder="Your bio goes here..."></textarea>
            <div className="max-w-[200px] m-auto">
              <SubmitButton className={'gap-2'}>
                <FontAwesomeIcon className="text-xl" icon={faSave} />
                <span>Save</span>
              </SubmitButton>
            </div>
          </div>
        </form>
      </SectionBox>
    </div>
  )
}

export default PageSettingForm