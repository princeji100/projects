'use server';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import UserNameForm from '@/components/forms/UserNameForm'
import Page from "@/models/Page";
import { redirect } from "next/navigation";
import PageSettingForm from "@/components/forms/PageSettingForm";
import PageButtonForm from "@/components/forms/PageButtonForm";
import PageLinkForm from "@/components/forms/PageLinkForm";
import connectToDatabase from "@/lib/connectToDB";

const AcountPage = async () => {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login')
    }
    await connectToDatabase();
    const page = await Page.findOne({ owner: session?.user?.email })

    if (!page) {
        return (
            <>
                <UserNameForm />
            </>
        )
    }

    // Convert the Mongoose document to a plain JavaScript object
    const plainPage = JSON.parse(JSON.stringify(page));

    // Convert the session user to a plain JavaScript object
    const plainUser = JSON.parse(JSON.stringify(session.user));
    return (
        <>
            <PageSettingForm page={plainPage} user={plainUser} />
            <PageButtonForm page={plainPage}/>
            <PageLinkForm page={plainPage} user={plainUser} />
        </>
    );
}

export default AcountPage
