'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import SectionBox from '../layout/SectionBox'
import { faCloudArrowUp, faGripLines, faLink, faPlus, faSave, faTrash } from '@fortawesome/free-solid-svg-icons';
import SubmitButton from '../buttons/SubmitButton';
import { useState } from 'react';
import { ReactSortable } from "react-sortablejs";
import upload from '@/lib/upload';
import Image from 'next/image';
import { SavePageLinks } from '@/action/PageAction';
import { toast } from 'react-toastify';

const PageLinkForm = ({ page }) => {
    const [links, setLinks] = useState(page.links || [])
    
    const save = async (e) => {
        e.preventDefault();
        await SavePageLinks(links);
        toast.success('Links saved successfully');
    }

    const addNewLink = () => {
        setLinks(prevs => [...prevs, { title: '', subtitle: '', icon: '', url: '' }]);
    }

    const handelUpload = async (e, index) => {
        await upload(e, uplodedImageUrl => {
            setLinks(prevs => prevs.map((link, i) => 
                i === index ? { ...link, icon: uplodedImageUrl } : link
            ));
        });
    }

    const handelLinkChange = (index, props, e) => {
        setLinks(prevs => prevs.map((link, i) => 
            i === index ? { ...link, [props]: e.target.value } : link
        ));
    }

    const removeLink = (indexToRemove) => {
        setLinks(prevLinks => prevLinks.filter((_, index) => index !== indexToRemove));
    };

    return (
        <SectionBox>
            <form onSubmit={save} className="space-y-8">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">Links</h2>
                    <button 
                        type="button" 
                        onClick={addNewLink} 
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                        <FontAwesomeIcon 
                            className="bg-blue-600 text-white p-1.5 rounded-full w-5 h-5" 
                            icon={faPlus} 
                        />
                        <span className="font-medium">Add new</span>
                    </button>
                </div>

                <ReactSortable 
                    handle=".handle" 
                    list={links} 
                    setList={setLinks}
                    className="space-y-6"
                >
                    {links.map((link, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="handle cursor-move text-slate-400 hover:text-slate-600 transition-colors">
                                    <FontAwesomeIcon icon={faGripLines} className="text-xl" />
                                </div>

                                <div className="flex flex-col items-center gap-3 min-w-[200px]">
                                    <div className="relative w-16 h-16 bg-slate-100 rounded-full overflow-hidden">
                                        {link.icon ? (
                                            <Image 
                                                src={link.icon} 
                                                fill
                                                className="object-cover" 
                                                alt={link.title || 'Link icon'} 
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <FontAwesomeIcon icon={faLink} className="text-2xl text-slate-400" />
                                            </div>
                                        )}
                                    </div>

                                    <label className="w-full">
                                        <input 
                                            onChange={e => handelUpload(e, index)} 
                                            id={`icon-${index}`} 
                                            type="file"
                                            accept="image/*"
                                            className="hidden" 
                                        />
                                        <span className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                                            <FontAwesomeIcon icon={faCloudArrowUp} />
                                            Change icon
                                        </span>
                                    </label>

                                    <button 
                                        type="button" 
                                        onClick={() => removeLink(index)}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                        Remove link
                                    </button>
                                </div>

                                <div className="grow space-y-4">
                                    <div>
                                        <label htmlFor={`title-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                                            Title
                                        </label>
                                        <input 
                                            id={`title-${index}`}
                                            type="text"
                                            value={link.title}
                                            onChange={e => handelLinkChange(index, 'title', e)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Enter link title"
                                            spellCheck="false"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor={`subtitle-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                                            Subtitle
                                        </label>
                                        <input 
                                            id={`subtitle-${index}`}
                                            type="text"
                                            value={link.subtitle}
                                            onChange={e => handelLinkChange(index, 'subtitle', e)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="Enter link subtitle (optional)"
                                            spellCheck="false"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor={`url-${index}`} className="block text-sm font-medium text-slate-700 mb-1">
                                            URL
                                        </label>
                                        <input 
                                            id={`url-${index}`}
                                            type="url"
                                            value={link.url}
                                            onChange={e => handelLinkChange(index, 'url', e)}
                                            className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            placeholder="https://example.com"
                                            spellCheck="false"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </ReactSortable>

                <div className="border-t border-slate-100 pt-6">
                    <SubmitButton className="mx-auto max-w-xs flex items-center justify-center gap-2">
                        <FontAwesomeIcon icon={faSave} />
                        <span>Save Changes</span>
                    </SubmitButton>
                </div>
            </form>
        </SectionBox>
    );
}

export default PageLinkForm;