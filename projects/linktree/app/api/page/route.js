import { getServerSession } from "next-auth";
import connectToDatabase from "@/lib/connectToDB";
import Page from "@/models/Page";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCanonicalProfileUrl } from "@/lib/siteUrl";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectToDatabase();
        const page = await Page.findOne({ owner: session.user.email });

        if (!page) {
            return Response.json(null);
        }

        const pageObj = page.toObject ? page.toObject() : page;
        return Response.json({
            ...pageObj,
            publicUrl: getCanonicalProfileUrl(page),
        });
    } catch (error) {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}