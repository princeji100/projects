'use client'
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines, faChartLine, faLeftLong } from '@fortawesome/free-solid-svg-icons';
import LogoutButton from "@/components/buttons/LogoutButton";
import { usePathname } from 'next/navigation';

const AppSidebar = () => {
    const pathname = usePathname();

    return (
        <nav className="flex flex-col text-slate-600 gap-3 mt-8">
            <Link 
                href={'/account'} 
                className={`flex gap-3 items-center px-4 py-2 rounded-lg transition-colors duration-200 
                    hover:bg-slate-50 hover:text-blue-600 
                    ${pathname === '/account' ? 'text-blue-600 bg-blue-50 font-medium' : ''}`}
            >
                <FontAwesomeIcon icon={faFileLines} className="w-5" />
                <span>My Page</span>
            </Link>
            
            <Link 
                href={'/account/analytics'} 
                className={`flex gap-3 items-center px-4 py-2 rounded-lg transition-colors duration-200 
                    hover:bg-slate-50 hover:text-blue-600
                    ${pathname === '/account/analytics' ? 'text-blue-600 bg-blue-50 font-medium' : ''}`}
            >
                <FontAwesomeIcon icon={faChartLine} className="w-5" />
                <span>Analytics</span>
            </Link>

            <div className="mt-4">
                <LogoutButton />
            </div>

            <Link 
                href={'/'} 
                className="flex gap-3 items-center px-4 py-2 mt-4 border-t border-slate-100 pt-6
                    text-slate-600 hover:text-blue-600 transition-colors duration-200"
            >
                <FontAwesomeIcon icon={faLeftLong} className="w-5" />
                <span>Back to website</span>
            </Link>
        </nav>
    )
}

export default AppSidebar