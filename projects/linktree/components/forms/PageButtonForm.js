'use client'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import SectionBox from "../layout/SectionBox"
import { faEnvelope, faGripLines, faMobile, faSave, faTrash } from "@fortawesome/free-solid-svg-icons"
import { faDiscord, faFacebook, faGithub, faInstagram, faInternetExplorer, faLinkedin, faPinterest, faReddit, faSnapchat, faTelegram, faTwitter, faViber, faWhatsapp, faYoutube } from "@fortawesome/free-brands-svg-icons"
import { useState } from "react"
import SubmitButton from "../buttons/SubmitButton"
import { SavePageButton } from "@/action/PageAction"
import { toast } from "react-toastify"
import { ReactSortable } from "react-sortablejs"

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
    ]

    const pageSavedButtonsKeys = Object.keys(page?.buttons || {})
    const pageSavedButtonsData = pageSavedButtonsKeys
        .map(key => allButton.find(b => b.key === key))
        .filter(button => button)

    const [activeButtons, setActiveButtons] = useState(pageSavedButtonsData || [])
    const [buttonValues, setButtonValues] = useState(page?.buttons || {})

    const addButtonToProfile = (button) => {
        setActiveButtons(prev => [...prev, button])
        setButtonValues(prev => ({ ...prev, [button.key]: '' }))
    }

    const availableButtons = allButton.filter(b1 => !activeButtons.find(b2 => b1.key === b2.key))

    const saveButton = async (e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        await SavePageButton(formData)
        toast.success('Button saved successfully')
    }

    const removeButton = (button) => {
        setActiveButtons(prev => prev.filter(b => b.key !== button.key))
        setButtonValues(prev => {
            const newValues = { ...prev }
            delete newValues[button.key]
            return newValues
        })
    }

    return (
        <SectionBox>
            <form onSubmit={saveButton} className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Buttons</h2>
                
                <ReactSortable 
                    handle=".grip" 
                    list={activeButtons} 
                    setList={setActiveButtons} 
                    className="space-y-4"
                >
                    {activeButtons.map(b => (
                        <div key={b.key} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-white rounded-lg shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 min-w-[150px]">
                                <FontAwesomeIcon 
                                    className="cursor-move grip text-slate-400 hover:text-slate-600 transition-colors" 
                                    icon={faGripLines} 
                                />
                                <FontAwesomeIcon 
                                    icon={b.icon} 
                                    className={`text-${b.key}-500`}
                                />
                                <span className="capitalize font-medium text-slate-700">
                                    {b.label}
                                </span>
                            </div>
                            
                            <div className="flex grow w-full md:w-auto">
                                <input
                                    value={buttonValues[b.key] || ''}
                                    onChange={(e) => setButtonValues(prev => ({
                                        ...prev,
                                        [b.key]: e.target.value
                                    }))}
                                    name={b.key}
                                    placeholder={b.placeholder}
                                    type="text"
                                    className="w-full px-4 py-2 rounded-l-lg border border-slate-200 
                                             focus:ring-2 focus:ring-blue-500 focus:border-transparent 
                                             transition-all"
                                    spellCheck="false"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => removeButton(b)} 
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 
                                             rounded-r-lg border-y border-r border-slate-200
                                             transition-colors duration-200"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    ))}
                </ReactSortable>

                <div className="flex flex-wrap gap-2 mt-6 border-y border-slate-100 py-6">
                    {availableButtons.map(b => (
                        <button 
                            key={b.key} 
                            type="button" 
                            onClick={() => addButtonToProfile(b)} 
                            className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 
                                     text-slate-700 rounded-lg transition-colors duration-200"
                        >
                            <FontAwesomeIcon icon={b.icon} className={`text-${b.key}-500`} />
                            <span className="capitalize">{b.label}</span>
                        </button>
                    ))}
                </div>

                <div className="flex justify-center pt-4">
                    <SubmitButton className="px-6">
                        <FontAwesomeIcon icon={faSave} className="text-lg" />
                        <span>Save Changes</span>
                    </SubmitButton>
                </div>
            </form>
        </SectionBox>
    )
}

export default PageButtonForm