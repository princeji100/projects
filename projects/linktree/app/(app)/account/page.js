'use server';
export const dynamic = 'force-dynamic';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import UserNameForm from '@/components/forms/UserNameForm';
import Page from "@/models/Page";
import { redirect } from "next/navigation";
import PageSettingForm from "@/components/forms/PageSettingForm";
import PageButtonForm from "@/components/forms/PageButtonForm";
import PageLinkForm from "@/components/forms/PageLinkForm";
import connectToDatabase from "@/lib/connectToDB";

async function AccountPage() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            redirect('/login');
        }

        await connectToDatabase();
        const page = await Page.findOne({ owner: session?.user?.email });

        if (!page) {
            return (
                <div className="max-w-xl mx-auto mt-8">
                    <UserNameForm />
                </div>
            );
        }

        const plainPage = JSON.parse(JSON.stringify(page));
        const plainUser = JSON.parse(JSON.stringify(session.user));

        return (
            <div className="space-y-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Account Settings</h1>
                    <p className="text-slate-600">Manage your profile and customize your Linktree page</p>
                </div>

                <div className="space-y-6">
                    <PageSettingForm page={plainPage} user={plainUser} />
                    <PageButtonForm page={plainPage} />
                    <PageLinkForm page={plainPage} user={plainUser} />
                </div>
            </div>
        );
    } catch (error) {
        console.error('Error in AccountPage:', error);
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
                <p className="text-slate-600">Please try again later</p>
            </div>
        );
    }
}

export default AccountPage;