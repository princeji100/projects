'use client'
import { signOut } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons'

const LogoutButton = () => {
    return (
        <button 
            onClick={() => signOut()} 
            className="flex items-center gap-2 px-4 py-2 rounded-lg
                     text-slate-600 hover:text-slate-900
                     bg-white hover:bg-slate-50
                     border border-slate-200 hover:border-slate-300
                     shadow-sm hover:shadow
                     transition-all duration-200 ease-in-out
                     font-medium"
        >
            <span>Logout</span>
            <FontAwesomeIcon 
                icon={faRightFromBracket} 
                className="text-sm transition-transform group-hover:translate-x-0.5" 
            />
        </button>
    )
}

export default LogoutButton