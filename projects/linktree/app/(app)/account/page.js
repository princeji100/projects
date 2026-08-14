'use client'
import { useEffect, useState } from 'react'
import UserNameForm from '@/components/forms/UserNameForm'
import { useRouter } from "next/navigation";
import PageSettingForm from "@/components/forms/PageSettingForm";
import QRCodeCard from "@/components/sections/QRCodeCard";
import PageButtonForm from "@/components/forms/PageButtonForm";
import PageLinkForm from "@/components/forms/PageLinkForm";
import PhonePreview from "@/components/preview/PhonePreview";
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faPen, faMobileScreen } from "@fortawesome/free-solid-svg-icons";

const AccountPage = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [pageData, setPageData] = useState(null);
    const [livePreviewState, setLivePreviewState] = useState({});
    const [liveButtons, setLiveButtons] = useState(null);
    const [liveLinks, setLiveLinks] = useState(null);
    const [mobileTab, setMobileTab] = useState('edit'); // 'edit' | 'preview'
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
                    setLiveButtons(data?.buttons || {});
                    setLiveLinks(data?.links || []);
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

    const previewProps = {
        page: pageData,
        user: session?.user,
        previewTheme: livePreviewState.theme,
        previewBgType: livePreviewState.bgType,
        previewBgColor: livePreviewState.bgColor,
        previewBgImage: livePreviewState.bgImage,
        previewAvatar: livePreviewState.avatar,
        previewDisplayName: livePreviewState.displayName,
        previewBio: livePreviewState.bio,
        previewLocation: livePreviewState.location,
        previewLinks: liveLinks !== null ? liveLinks : pageData?.links,
        previewButtons: liveButtons !== null ? liveButtons : pageData?.buttons,
    };

    return (
        <div className="space-y-6 relative">
            {/* Page Title & Mobile Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Account Settings</h1>
                    <p className="text-slate-500 text-sm mt-0.5">Customize your profile, themes, links, and preview changes live</p>
                </div>

                {/* Mobile View Toggle: Edit vs Preview */}
                <div className="inline-flex lg:hidden bg-slate-200/80 p-1 rounded-xl w-full sm:w-auto shadow-inner self-start">
                    <button
                        type="button"
                        onClick={() => setMobileTab('edit')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            mobileTab === 'edit'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <FontAwesomeIcon icon={faPen} className="text-xs" />
                        <span>Edit Settings</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('preview')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            mobileTab === 'preview'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <FontAwesomeIcon icon={faEye} className="text-xs text-blue-600" />
                        <span>Live Preview</span>
                    </button>
                </div>
            </div>

            {/* Floating Mobile Preview Switcher Button */}
            <button
                type="button"
                onClick={() => setMobileTab((tab) => (tab === 'edit' ? 'preview' : 'edit'))}
                aria-label="Toggle mobile live preview"
                className="fixed bottom-20 right-4 z-40 lg:hidden shadow-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-full px-4 py-2.5 flex items-center gap-2 border border-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
                <FontAwesomeIcon
                    icon={mobileTab === 'edit' ? faMobileScreen : faPen}
                    className="text-xs text-blue-400"
                />
                <span>{mobileTab === 'edit' ? 'Show Preview' : 'Back to Edit'}</span>
            </button>

            {/* Dashboard Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Main Settings Forms Column (Hidden on mobile if user switched to preview tab) */}
                <div className={`lg:col-span-7 xl:col-span-7 space-y-6 ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}`}>
                    <PageSettingForm
                        page={pageData}
                        user={session?.user}
                        onStateChange={setLivePreviewState}
                    />
                    <PageButtonForm
                        page={pageData}
                        onButtonsChange={setLiveButtons}
                    />
                    <PageLinkForm
                        page={pageData}
                        user={session?.user}
                        onLinksChange={setLiveLinks}
                    />
                    <QRCodeCard
                        uri={pageData?.uri}
                        publicUrl={pageData?.publicUrl}
                        user={session?.user}
                    />
                </div>

                {/* Live Phone Mockup Preview Column (Sticky on desktop, full view when preview tab active on mobile) */}
                <div className={`lg:col-span-5 xl:col-span-5 ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
                    <PhonePreview {...previewProps} />
                </div>
            </div>
        </div>
    );
}

export default AccountPage;