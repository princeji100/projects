'use client'
import { useEffect, useState } from 'react'
import UserNameForm from '@/components/forms/UserNameForm'
import { useRouter } from "next/navigation";
import PageSettingForm from "@/components/forms/PageSettingForm";
import PageButtonForm from "@/components/forms/PageButtonForm";
import PageLinkForm from "@/components/forms/PageLinkForm";
import { useSession } from 'next-auth/react'

const AccountPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [pageData, setPageData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetch('/api/page')  // You'll need to create this API route
                .then(res => res.json())
                .then(data => {
                    setPageData(data);
                    setLoading(false);
                })
                .catch(err => {
                    setError(err);
                    setLoading(false);
                });
        }
    }, [status, router]);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                <p className="text-slate-600">Please try again later</p>
            </div>
        );
    }

    if (!pageData) {
        return (
            <div className="max-w-xl mx-auto mt-8">
                <UserNameForm />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Account Settings</h1>
                <p className="text-slate-600">Manage your profile and customize your Linktree page</p>
            </div>

            <div className="space-y-6">
                <PageSettingForm page={pageData} user={session.user} />
                <PageButtonForm page={pageData} />
                <PageLinkForm page={pageData} user={session.user} />
            </div>
        </div>
    );
}

export default AccountPage;