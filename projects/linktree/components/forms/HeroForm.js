'use client';
import { signIn } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const HeroForm = () => {
    const { data: session } = useSession()
    const [Username, setUsername] = useState('')

    useEffect(() => {
        if('localStorage' in window && window.localStorage.getItem('Choiceusername')) {
           const username = window.localStorage.getItem('Choiceusername')
           setUsername(username)
           window.localStorage.removeItem('Choiceusername')
           redirect(`/account?Choiceusername=${username}`)
        }
    }, [])

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
        <form 
            onSubmit={handleSubmit} 
            className="flex flex-col md:flex-row w-full max-w-2xl mx-auto"
        >
            <div className="flex flex-1 border border-slate-200 rounded-lg md:rounded-r-none overflow-hidden shadow-sm">
                <span className="bg-slate-50 text-slate-500 py-4 px-4 border-r border-slate-200 hidden md:block">
                    linktree-princeji.vercel.app/
                </span>
                <span className="bg-slate-50 text-slate-500 py-4 px-4 border-r border-slate-200 md:hidden">
                    linktree/
                </span>
                <input 
                    type="text" 
                    value={Username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="flex-1 px-4  py-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200"
                    placeholder="Username" 
                    spellCheck="false"
                />
            </div>
            <button 
                type="submit" 
                className="mt-3 md:mt-0 bg-blue-600 hover:bg-blue-700 text-white py-4 px-8 rounded-lg md:rounded-l-none transition duration-200 font-medium shadow-sm hover:shadow-md"
            >
                Join for Free
            </button>
        </form>
    )
}

export default HeroForm