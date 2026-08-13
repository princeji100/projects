'use client'
import LoginWithGoogle from '@/components/buttons/LoginWithGoogle'
import { useSession } from 'next-auth/react'
import { redirect, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// authOptions.pages.error routes ALL four NextAuth error codes here, so an unrecognised
// code must still render something. The value is only ever compared against a literal —
// it is never interpolated into the DOM, so a hostile ?error= cannot reflect (T-05-04).
const SignInError = () => {
  const error = useSearchParams().get('error')
  if (!error) return null

  return (
    <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
      {error === 'AccessDenied'
        ? 'This app is invite-only — contact the owner for access.'
        : 'Sign-in failed. Please try again.'}
    </div>
  )
}

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
          {/* useSearchParams opts the subtree into client rendering; without this
              boundary `npm run build` fails during static generation. */}
          <Suspense fallback={null}>
            <SignInError />
          </Suspense>
          <LoginWithGoogle />
        </div>
      </div>
    </div>
  )
}

export default Login