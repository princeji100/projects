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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-md mx-auto p-6 pt-16 md:pt-32">
        <div className="bg-white p-8 rounded-xl shadow-sm">
          <h1 className="text-4xl font-bold text-slate-800 text-center mb-6">
            Sign In
          </h1>
          <p className="text-center mb-8 text-slate-600 leading-relaxed">
            Sign in to your account using one of the methods below
          </p>
          <LoginWithGoogle />
        </div>
      </div>
    </div>
  )
}

export default Login