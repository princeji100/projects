'use client';
import { signIn } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const HeroForm = () => {
    const { data: session } = useSession();
    const [Username, setUsername] = useState('');

    useEffect(() => {
        if('localStorage' in window && window.localStorage.getItem('Choiceusername')) {
           const username = window.localStorage.getItem('Choiceusername');
           setUsername(username);
           window.localStorage.removeItem('Choiceusername');
           redirect(`/account?Choiceusername=${username}`);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = Username.trim().toLowerCase();
        if (trimmed.length > 0) {
            window.localStorage.setItem('Choiceusername', trimmed);
            if (session) {
                redirect(`/account?Choiceusername=${trimmed}`);
            } else {
                await signIn('google');
                redirect(`/account?Choiceusername=${trimmed}`);
            }
        }
    };

    return (
        <form 
            onSubmit={handleSubmit} 
            className="flex flex-col sm:flex-row w-full gap-2 sm:gap-0"
        >
            <div className="flex flex-1 items-center border border-slate-200 rounded-xl sm:rounded-r-none overflow-hidden bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                <label htmlFor="hero-claim-input" className="bg-slate-100 text-slate-500 py-3.5 px-3.5 border-r border-slate-200 text-xs sm:text-sm font-mono select-none">
                    linktree/
                </label>
                <input 
                    id="hero-claim-input"
                    type="text" 
                    value={Username} 
                    onChange={e => setUsername(e.target.value)} 
                    className="flex-1 px-3.5 py-3.5 bg-white text-slate-800 text-sm focus:outline-none min-h-[44px]"
                    placeholder="yourname" 
                    spellCheck="false"
                    aria-label="Enter your desired username"
                />
            </div>
            <button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold py-3.5 px-6 rounded-xl sm:rounded-l-none transition-all shadow-sm min-h-[44px] flex items-center justify-center text-sm cursor-pointer"
            >
                Claim your link
            </button>
        </form>
    );
};

export default HeroForm;