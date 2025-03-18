'use server';
import mongoose from 'mongoose';
import Page from '@/models/Page';
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
let isConnected = false; // Track the MongoDB connection status

const handleFormSubmit = async (formdata) => {
    const session = await getServerSession(authOptions);

    const username = formdata.get('username')?.toLowerCase(); // Convert to lowercase
    if (!username) {
        console.error('No username provided.');
        return; // Exit if no username is provided
    }

    // ...existing code...
    try {
        // Check if the connection is already established
        if (!isConnected) {
            await mongoose.connect(process.env.MONGODB_URI);
            isConnected = true;
        }

        if (!session?.user?.email) {
            console.error('No user email found in session');
            return { success: false, error: 'Authentication required' };
        }

        if (!Page) {
            console.error('Page model is undefined');
            return { success: false, error: 'Internal server error' };
        }

        const page = await Page.findOne({ uri: username });
        if (page) {
            console.log('Username already taken:', username);
            return { success: false, error: 'Username already taken' };
        }

        const pageDoc = await Page.create({
            uri: username,
            owner: session.user.email
        });

        console.log('Page uri Saved:', pageDoc.uri);
        const plainPageDoc = {
            uri: pageDoc.uri,
            owner: pageDoc.owner,
            _id: pageDoc._id.toString(),
            createdAt: pageDoc.createdAt,
            updatedAt: pageDoc.updatedAt,
            __v: pageDoc.__v
        };
        return { success: true, data: plainPageDoc };
    } catch (err) {
        console.error('Error while saving the page:', err.message);
        return { success: false, error: err.message };
    }

};

export default handleFormSubmit;