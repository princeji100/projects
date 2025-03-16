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
        setLinks(prevs => {
            return [...prevs, { title: '', subtitle: '', icon: '', url: '' }];
        })
    }
    const handelUpload = async (e, index) => {
        await upload(e, uplodedImageUrl => {
            setLinks(prevs => {
                return prevs.map((link, i) => {
                    if (i === index) {
                        return {
                            ...link,
                            icon: uplodedImageUrl
                        }
                    }
                    return link;
                })
            })
        })
    }
    const handelLinkChange = (index, props, e) => {
        setLinks(prevs => {
            return prevs.map((link, i) => {
                if (i === index) {
                    return {
                        ...link,
                        [props]: e.target.value
                    }
                }
                return link;
            })
        })
    }
    const removeLink = (indexToRemove) => {
        setLinks(prevLinks => prevLinks.filter((_, index) => index !== indexToRemove));
    };
return (
    <SectionBox>
        <form onSubmit={save}>
            <h2 className='text-2xl font-bold mb-4'>Links</h2>
            <button type='button' onClick={addNewLink} className='text-blue-500 cursor-pointer text-lg flex gap-2 items-center'>
                <FontAwesomeIcon className='bg-blue-500 text-white p-1 rounded-full aspect-square' icon={faPlus} />
                <span>Add new</span>
            </button>
            <div>
                <ReactSortable handle={'.my-handle'} list={links} setList={setLinks}>
                    {links.map((link, index) => (
                        <div key={index} className='md:flex gap-6 items-center mt-8'>
                            <div className='my-handle'>
                                <FontAwesomeIcon className='cursor-move text-gray-500 mr-2' icon={faGripLines} />
                            </div>
                            <div className='flex flex-col items-center gap-2'>
                                <div className="bg-gray-300 w-fit overflow-hidden flex items-center rounded-full aspect-square">
                                    {link.icon && <Image className='rounded-full' src={link.icon} width={64} height={64} alt='icon' />}
                                    {!link.icon && <FontAwesomeIcon className='p-4 text-2xl' icon={faLink} />}
                                </div>
                                <input onChange={e => handelUpload(e, index)} id={`input-${index}`} className='hidden' type="file" />
                                <label htmlFor={`input-${index}`} className='border w-full border-gray-300 text-gray-600 justify-center items-center p-2 capitalize flex gap-2 cursor-pointer' type='button'>
                                    <FontAwesomeIcon icon={faCloudArrowUp} />
                                    <span>
                                        Change icon
                                    </span>
                                </label>
                                <button type='button' onClick={() => removeLink(index)} className= 'w-full bg-gray-300 py-2 px-3 mb-2 flex gap-2 justify-center items-center cursor-pointer'>
                                    <FontAwesomeIcon icon={faTrash} />
                                    <span>Remove this link</span>
                                </button>
                            </div>
                            <div className='form grow'>
                                <label className='text-gray-700' htmlFor={`title-${index}`}>Title</label>
                                <input id={`title-${index}`} value={link.title} onChange={e => handelLinkChange(index, 'title', e)} spellCheck="false" data-ms-editor="true" type="text" placeholder='title' />
                                <label className='text-gray-700' htmlFor={`subtitle-${index}`}>Subtitle</label>
                                <input id={`subtitle-${index}`} type="text" value={link.subtitle} onChange={e => handelLinkChange(index, 'subtitle', e)} spellCheck="false" data-ms-editor="true" placeholder='subtitle (optional)' />
                                <label className='text-gray-700' htmlFor={`url-${index}`}>Url</label>
                                <input id={`url-${index}`} value={link.url} onChange={e => handelLinkChange(index, 'url', e)} type="text" spellCheck="false" data-ms-editor="true" placeholder='url' />
                            </div>
                        </div>
                    ))}
                </ReactSortable>
            </div>
            <div className='border-t-2 border-gray-100 pt-4 mt-4 '>
                <SubmitButton className={'max-w-xs mx-auto'}>
                    <FontAwesomeIcon icon={faSave} />
                    <span>
                        Save
                    </span>
                </SubmitButton>
            </div>
        </form>
    </SectionBox>
)
}

export default PageLinkForm