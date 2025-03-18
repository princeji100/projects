'use client';
import { signIn } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
const HeroForm = () => {
    const { data: session } = useSession()
    useEffect(() => {
        if('localStorage' in window && window.localStorage.getItem('Choiceusername')) {
           const username = window.localStorage.getItem('Choiceusername')
           setUsername(username)
           window.localStorage.removeItem('Choiceusername')
           redirect(`/account?Choiceusername=${username}`)
        }

    }, [])
    const [Username, setUsername] = useState('')
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (Username.length > 0) {
            window.localStorage.setItem('Choiceusername', Username)
            if (session) {
                redirect(`/account?Choiceusername=${Username}`)
            } else {
                await signIn('google')
                redirect(`/account?Choiceusername=${Username}`)
            }
        }
    }
    return (
        <form onSubmit={handleSubmit} className='flex-col gap-2 md:gap-0 flex md:flex-row items-center w-fit md:shadow-lg md:shadow-gray-500/20'>
            <div className="flex">
            <span className='bg-white min-w-fit py-4 pl-4'>
            linktree-princeji.vercel.app/
            </span>
            <input type="text" value={Username} onChange={e => setUsername(e.target.value)} className='py-4 bg-white focus:outline-none' placeholder='Username' spellCheck="false" data-ms-editor="true" />
            </div>
            <button type='submit' className='bg-blue-600 rounded-xl md:rounded-none text-white py-4 px-6 cursor-pointer'>Join for Free</button>
        </form>
    )
}

export default HeroForm