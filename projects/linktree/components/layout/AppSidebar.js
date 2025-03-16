'use client'
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines, faChartLine,faLeftLong } from '@fortawesome/free-solid-svg-icons';
import LogoutButton from "@/components/buttons/LogoutButton";
import { usePathname } from 'next/navigation';
const AppSidebar = () => {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col text-gray-700 items-center mt-6 gap-2">
            <Link className={`flex gap-2 items-center p-1 ${pathname === '/account'?'text-blue-700':''}`} href={'/account'}>
                <FontAwesomeIcon icon={faFileLines} className="w-8" />
                <span>My Page</span>
            </Link>
            <Link className={`flex gap-2 items-center p-1 ${pathname === '/account/analytics'?'text-blue-700':''}`} href={'/account/analytics'}>
                <FontAwesomeIcon icon={faChartLine} className="w-8" />
                <span>Analytics</span>
            </Link>
            <LogoutButton />
            <Link className="flex border-t pt-4 items-center" href={'/'}>
                <FontAwesomeIcon icon={faLeftLong} className="w-8" />
                <span className="text-gray-700">Back to website</span>
            </Link>
        </nav>
    )
}

export default AppSidebar