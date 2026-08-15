'use client';
import { signIn } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const HeroForm = () => {
    const { data: session } = useSession();
    const [Username, setUsername] = useState('');

    const [hostPrefix, setHostPrefix] = useState('links.princeji.com/');

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.host) {
            setHostPrefix(`${window.location.host}/`);
        }
        if('localStorage' in window && window.localStorage.getItem('Choiceusername')) {
           const username = window.localStorage.getItem('Choiceusername');
           setUsername(username);
           window.localStorage.removeItem('Choiceusername');
           redirect(`/dashboard?Choiceusername=${username}`);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = Username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (trimmed.length > 0) {
            window.localStorage.setItem('Choiceusername', trimmed);
            if (session) {
                redirect(`/dashboard?Choiceusername=${trimmed}`);
            } else {
                await signIn('google');
                redirect(`/dashboard?Choiceusername=${trimmed}`);
            }
        }
    };

    return (
        <form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row w-full gap-2 sm:gap-0"
        >
            <div className="flex flex-1 items-center border border-slate-200 rounded-2xl sm:rounded-r-none overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                <label htmlFor="hero-claim-input" className="bg-slate-100/80 text-slate-500 py-3.5 px-3 border-r border-slate-200 text-xs sm:text-xs font-mono select-none truncate max-w-[210px] sm:max-w-[230px]" title={hostPrefix}>
                    {hostPrefix}
                </label>
                <input 
                    id="hero-claim-input"
                    type="text" 
                    value={Username} 
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))} 
                    className="flex-1 px-3 py-3.5 bg-white text-slate-800 text-sm font-semibold focus:outline-none min-h-[46px]"
                    placeholder="yourname" 
                    spellCheck="false"
                    autoComplete="off"
                    aria-label="Enter your desired username"
                />
            </div>
            <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold py-3.5 px-6 rounded-2xl sm:rounded-l-none transition-all shadow-xs min-h-[46px] flex items-center justify-center text-sm cursor-pointer shrink-0"
            >
                Claim your link
            </button>
        </form>
    );
};

export default HeroForm;