'use client'
import { useEffect, useState } from 'react'
import UserNameForm from '@/components/forms/UserNameForm'
import { useRouter } from "next/navigation";
import PageSettingForm from "@/components/forms/PageSettingForm";
import QRCodeCard from "@/components/sections/QRCodeCard";
import PageButtonForm from "@/components/forms/PageButtonForm";
import PageLinkForm from "@/components/forms/PageLinkForm";
import PhonePreview from "@/components/preview/PhonePreview";
import { useSession } from 'next-auth/react'

const AccountPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [pageData, setPageData] = useState(null);
    const [livePreviewState, setLivePreviewState] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetch('/api/page')
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
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8 bg-white rounded-2xl border border-red-100 shadow-xs max-w-md mx-auto">
                <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
                <p className="text-slate-600 text-sm">Please refresh or try again later</p>
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Account Settings</h1>
                <p className="text-slate-500 text-sm mt-0.5">Manage your profile, theme presets, links, and live preview</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Main Settings Forms Column */}
                <div className="lg:col-span-7 xl:col-span-7 space-y-6">
                    <PageSettingForm
                        page={pageData}
                        user={session?.user}
                        onStateChange={setLivePreviewState}
                    />
                    <QRCodeCard uri={pageData?.uri} publicUrl={pageData?.publicUrl} />
                    <PageButtonForm page={pageData} />
                    <PageLinkForm page={pageData} user={session?.user} />
                </div>

                {/* Sticky Live Phone Mockup Preview Column */}
                <div className="hidden lg:block lg:col-span-5 xl:col-span-5">
                    <PhonePreview
                        page={pageData}
                        user={session?.user}
                        previewTheme={livePreviewState.theme}
                        previewBgType={livePreviewState.bgType}
                        previewBgColor={livePreviewState.bgColor}
                        previewBgImage={livePreviewState.bgImage}
                        previewAvatar={livePreviewState.avatar}
                        previewDisplayName={livePreviewState.displayName}
                        previewBio={livePreviewState.bio}
                        previewLocation={livePreviewState.location}
                        previewLinks={pageData?.links}
                        previewButtons={pageData?.buttons}
                    />
                </div>
            </div>
        </div>
    );
}

export default AccountPage;