'use client'
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { signIn} from 'next-auth/react'
const LoginWithGoogle = () => {
  return (

    <button onClick={() => signIn('google')} className='flex cursor-pointer hover:bg-slate-200 gap-3 items-center justify-center bg-white shadow text-center w-full py-4'>
      <FontAwesomeIcon icon={faGoogle} className='text-2xl' />
      <span>
        Sign In With Google
      </span>
    </button>

  )
}

export default LoginWithGoogle