'use client';
import Link from "next/link"
import LogoutButton from "./buttons/LogoutButton";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLink } from '@fortawesome/free-solid-svg-icons'
import { useSession } from "next-auth/react";
const Header = () => {
  const { data: session } = useSession()
  return (
    <header className='bg-white p-4'>
      <div className="max-w-4xl flex justify-between items-center mx-auto px-6">
        <div className='flex gap-6 items-center justify-center'>
          <Link href={'/'} className="flex gap-1 items-center justify-center hover:text-blue-700 text-blue-500">
            <FontAwesomeIcon icon={faLink} />
            <span className="font-bold">
              LinkTree
            </span>
          </Link>
          <nav className='flex items-center gap-3 text-slate-500 text-sm'>
            <Link href={'/about'}>About</Link>
          </nav>
        </div>
        <nav className='flex justify-center items-center gap-3 text-sm text-slate-500'>
          {session && (
            <>
              <Link href={'/account'}>Hello {session.user.name}</Link>
              <LogoutButton />
            </>
          )}
          {!session && (
            <>
              <Link href={'/login'}>Sign In</Link>
              <Link href={'/login'}>Create Account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header