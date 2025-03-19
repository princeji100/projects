import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Image from 'next/image';
import AppSidebar from "@/components/layout/AppSidebar";
import { ToastContainer } from 'react-toastify';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLink } from "@fortawesome/free-solid-svg-icons";
import Page from "@/models/Page";
import Link from "next/link";
import connectToDatabase from "@/lib/connectToDB";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: `Account Dashboard`,
  description: "Manage your Linktree profile and links",
};

export default async function AppLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return redirect('/login')
  }
  
await connectToDatabase();
  const page = await Page.findOne({ owner: session?.user?.email })
  
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}>
        <SessionWrapper>
          <ToastContainer 
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
          />
          <main className="md:flex min-h-screen transition-all">
            <aside className="bg-white shadow-md min-w-48 p-4 py-8 border-r border-slate-100">
              <div className="sticky top-0 p-2">
                <div className="rounded-full bg-slate-100 overflow-hidden w-[90px] h-[90px] mx-auto ring-2 ring-slate-100">
                  <Image 
                    src={session.user.image} 
                    width={90} 
                    height={90} 
                    alt={session.user.name}
                    className="object-cover object-center"
                  />
                </div>
                {page && (
                  <Link 
                    href={`/${page.uri}`} 
                    target="_blank" 
                    className="flex gap-2 mt-4 items-center justify-center text-slate-600 hover:text-blue-600 transition-colors duration-200"
                  >
                    <FontAwesomeIcon className="text-blue-500 text-lg" icon={faLink} />
                    <span className="text-lg text-slate-300">/</span>
                    <span className="underline font-medium">{page.uri}</span>
                  </Link>
                )}
                <AppSidebar />
              </div>
            </aside>
            <div className="grow p-6 md:p-8">
              {children}
            </div>
          </main>
        </SessionWrapper>
      </body>
    </html>
  );
}