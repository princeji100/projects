'use server'
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import Page from "@/models/Page"
import User from "@/models/User"
import connectToDatabase from "@/lib/connectToDB"
import { getServerSession } from "next-auth"

const SavePageSetting = async (formData) => {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);
        if (session) {
            const dataKey = ['displayName', 'location', 'bio', 'bgType', 'bgColor', 'bgImage'];
            const dataToUpdate = {};
            for (const key of dataKey) {
                if (formData.has(key)) {
                    dataToUpdate[key] = formData.get(key);
                }
            }
            await Page.updateOne({ owner: session?.user?.email }, dataToUpdate);
            if (formData.has('avatar')) {
                const avatarLink = formData.get('avatar');
                await User.updateOne(
                    { email: session?.user?.email },
                    { image: avatarLink },
                );
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error saving page settings:', error);
        return false;
    }
};

const SavePageButton = async (formData) => {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);
        if (session) {
            const buttonsValues = {};
            formData.forEach((value, key) => {
                buttonsValues[key] = value;
            });
            const dataToUpdate = { buttons: buttonsValues };
            await Page.updateOne({ owner: session?.user?.email }, dataToUpdate);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error saving buttons:', error);
        return false;
    }
};
const SavePageLinks = async (links) => {
    try {
        await connectToDatabase();
        const session = await getServerSession(authOptions);
        if (session) {
            await Page.updateOne({ owner: session?.user?.email }, {links});
        }
        return false;
    } catch (error) {
        console.error('Error saving links:', error);
        return false;
    }
};

export { SavePageSetting, SavePageButton , SavePageLinks};