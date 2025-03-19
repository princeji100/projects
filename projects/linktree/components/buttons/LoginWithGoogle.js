'use client'
import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGoogle } from '@fortawesome/free-brands-svg-icons'
import { signIn } from 'next-auth/react'

const LoginWithGoogle = () => {
  return (
    <button 
      onClick={() => signIn('google')} 
      className='flex cursor-pointer gap-3 items-center justify-center 
                 bg-white hover:bg-slate-50 shadow-sm hover:shadow 
                 text-center w-full py-4 px-6 rounded-lg
                 text-slate-700 font-medium
                 transition-all duration-200 ease-in-out
                 border border-slate-200 hover:border-slate-300'
    >
      <FontAwesomeIcon 
        icon={faGoogle} 
        className='text-xl text-slate-600' 
      />
      <span>
        Sign In With Google
      </span>
    </button>
  )
}

export default LoginWithGoogle