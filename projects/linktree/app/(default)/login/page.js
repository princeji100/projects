'use client'
import LoginWithGoogle from '@/components/buttons/LoginWithGoogle'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
const Login = () => {
  const { data: session } = useSession()
  
  if(session){
    redirect('/')
  }
  return (
    <div>
      <div className='p-4 max-w-xs mx-auto'>
      <h1 className='text-4xl font-bold text-center mb-6'>Sign In</h1>
      <p className='text-center mb-6 text-gray-500'>Sign in to your account using one of the method below</p>
      <LoginWithGoogle />
      </div>
    </div>
  )
}

export default Login