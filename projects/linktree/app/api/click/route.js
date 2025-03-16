import connectToDatabase from "@/lib/connectToDB";
import Event from "@/models/Event";

export const POST = async (req) => {
  const { searchParams } = new URL(req.url);
  const uri = atob(searchParams.get('url'));
  const page = searchParams.get('page');
  await connectToDatabase();
  await Event.create({ type: 'click', url: uri ,page});
  return Response.json(true);
};