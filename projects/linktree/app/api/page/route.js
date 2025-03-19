import { getServerSession } from "next-auth";
import connectToDatabase from "@/lib/connectToDB";
import Page from "@/models/Page";
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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

        return Response.json(page);
    } catch (error) {
        return Response.json({ error: "Internal Server Error" }, { status: 500 });
    }
}