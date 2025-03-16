'use client'
import { signOut } from 'next-auth/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons'
const LogoutButton = () => {
    return (
        <button className='cursor-pointer hover:bg-slate-200 flex p-2 px-4 shadow gap-2 items-center' onClick={() => signOut()}>
            <span>
                Logout
            </span>
            <FontAwesomeIcon icon={faRightFromBracket} />
        </button>
    )
}

export default LogoutButton