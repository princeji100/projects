'use client'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import SectionBox from "../layout/SectionBox"
import { faEnvelope, faGripLines, faMobile, faSave, faTrash } from "@fortawesome/free-solid-svg-icons"
import { faDiscord, faFacebook, faGithub, faInstagram, faInternetExplorer, faLinkedin, faPinterest, faReddit, faSnapchat, faTelegram, faTwitter, faViber, faWhatsapp, faYoutube } from "@fortawesome/free-brands-svg-icons"
import { useState } from "react"
import SubmitButton from "../buttons/SubmitButton"
import { SavePageButton } from "@/action/PageAction"
import { toast } from "react-toastify"
import { ReactSortable } from "react-sortablejs";

const PageButtonForm = ({ page }) => {

    const allButton = [
        { key: 'email', label: 'e-mail', icon: faEnvelope, placeholder: 'test@gmail.com' },
        { key: 'mobile', label: 'mobile', icon: faMobile, placeholder: '+91 91526 54562' },
        { key: 'instagram', label: 'instagram', icon: faInstagram, placeholder: '@yourusername' },
        { key: 'twitter', label: 'twitter', icon: faTwitter, placeholder: '@yourusername' },
        { key: 'facebook', label: 'facebook', icon: faFacebook, placeholder: 'facebook.com/yourprofile' },
        { key: 'linkedin', label: 'linkedin', icon: faLinkedin, placeholder: 'linkedin.com/in/yourprofile' },
        { key: 'discord', label: 'discord', icon: faDiscord, placeholder: 'username#1234' },
        { key: 'youtube', label: 'youtube', icon: faYoutube, placeholder: 'youtube.com/c/yourchannel' },
        { key: 'whatsapp', label: 'whatsapp', icon: faWhatsapp, placeholder: '+1234567890' },
        { key: 'telegram', label: 'telegram', icon: faTelegram, placeholder: '@yourusername' },
        { key: 'viber', label: 'viber', icon: faViber, placeholder: '+1234567890' },
        { key: 'snapchat', label: 'snapchat', icon: faSnapchat, placeholder: '@yourusername' },
        { key: 'pinterest', label: 'pinterest', icon: faPinterest, placeholder: 'pinterest.com/yourprofile' },
        { key: 'reddit', label: 'reddit', icon: faReddit, placeholder: 'reddit.com/user/yourusername' },
        { key: 'website', label: 'website', icon: faInternetExplorer, placeholder: 'https://yourwebsite.com' },
        { key: 'github', label: 'github', icon: faGithub, placeholder: 'github.com/yourusername' },
    ];
    const pageSavedButtonsKeys = Object.keys(page?.buttons || {});

    const pageSavedButtonsData = pageSavedButtonsKeys.map(key => (
        allButton.find(b => b.key === key)
    )).filter(button => button);
    const [activeButtons, setActiveButtons] = useState(pageSavedButtonsData || []);

    // Add this new state to track button values
    const [buttonValues, setButtonValues] = useState(page?.buttons || {});

    const addButtonToProfile = (button) => {
        setActiveButtons(previousButtons => {
            return [...previousButtons, button]
        });
        // Initialize empty value for new button
        setButtonValues(prev => ({ ...prev, [button.key]: '' }));
    }
    const availableButtons = allButton.filter(b1 => !activeButtons.find(b2 => b1.key === b2.key));
    const saveButton = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await SavePageButton(formData);
        toast.success('Button saved successfully');
    }
    const removeButton = (button) => {
        setActiveButtons(previousButtons => {
            return previousButtons.filter(b => b.key !== button.key)
        })
    }
    return (
        <SectionBox>
            <form onSubmit={saveButton}>
                <h2 className="text-2xl font-bold mb-4">Buttons</h2>
                <ReactSortable handle=".grip" list={activeButtons} setList={setActiveButtons} className="mb-4">
                    {activeButtons.map(b => (
                        <div className="form mb-4 md:flex items-center" key={b.key}>
                            <div className="w-50 p-2 pl-0 mb-2 text-gray-700 flex gap-2 items-center">
                                <FontAwesomeIcon className="cursor-move grip text-gray-500 pr-2" icon={faGripLines} />
                                <FontAwesomeIcon icon={b.icon} />
                                <span className="capitalize">
                                    {b.label}:
                                </span>
                            </div>
                            <div className="flex grow">

                                <input
                                    value={buttonValues[b.key] || ''}
                                    onChange={(e) => setButtonValues(prev => ({
                                        ...prev,
                                        [b.key]: e.target.value
                                    }))}
                                    spellCheck="false"
                                    data-ms-editor="true"
                                    name={b.key}
                                    placeholder={b.placeholder}
                                    type="text"
                                />
                                <button type="button" onClick={() => removeButton(b)} className="px-4 py-2 mb-2 cursor-pointer bg-gray-300">
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    ))}
                </ReactSortable>
                <div className="flex flex-wrap gap-2 mt-4 border-y-2 border-gray-100 py-4">
                    {availableButtons.map(b => (
                        <button key={b.key} type="button" onClick={() => addButtonToProfile(b)} className={`flex gap-2 p-2 bg-gray-200 items-center`}>
                            <FontAwesomeIcon icon={b.icon} />
                            <span className="capitalize">{b.label}</span>
                        </button>
                    ))}
                </div>
                <div className="max-w-xs mx-auto mt-8">
                    <SubmitButton>
                        <FontAwesomeIcon icon={faSave} />
                        <span>Save</span>
                    </SubmitButton>
                </div>
            </form>
        </SectionBox>
    )
}

export default PageButtonForm