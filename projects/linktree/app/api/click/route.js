import connectToDatabase from "@/lib/connectToDB";
import Event from "@/models/Event";
import Page from "@/models/Page";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";
import { parseDevice, normalizeReferrer } from "@/lib/analyticsParser";
import { getBaseUrl } from "@/lib/siteUrl";

export const POST = async (req) => {
  // D-18/D-19: the only unauthenticated write in the app, so there is no session to
  // key on — rateLimitKey falls through to the first x-forwarded-for entry. First,
  // so a flood costs one upsert instead of an upsert plus two reads.
  const { allowed, retryAfter } = await checkRateLimit('click', rateLimitKey('click', null, req));
  if (!allowed) {
    return Response.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get('url');
  const page = searchParams.get('page');

  // BEFORE atob, not inside the try/catch. `atob(null)` does not throw — it
  // stringifies to "null" and decodes to "ée", which is how a missing param used to
  // produce a garbage Event with HTTP 200. A try/catch can never see this one.
  if (!raw || !page) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  let url;
  try {
    url = atob(raw);
    // atob('abc') returns junk without throwing, so the throw alone proves nothing.
    // The round trip does: btoa emits canonical padded base64, and the only caller
    // (app/(page)/[uri]/page.js) produces the param with btoa.
    if (btoa(url) !== raw) throw new Error('not canonical base64');
  } catch {
    return Response.json({ error: 'Invalid url parameter' }, { status: 400 });
  }

  await connectToDatabase();

  // D-27: without this any stranger can inflate `events` with arbitrary page names,
  // polluting exactly the data Phase 5's analytics reports on. `uri` is unique and
  // therefore indexed; existence is all we need, so do not pull the document.
  const exists = await Page.findOne({ uri: page }).select('_id').lean();
  if (!exists) {
    return Response.json({ error: 'Unknown page' }, { status: 400 });
  }

  // Phase 5: Server-side device & referrer normalization (ANA-01)
  const userAgent = req.headers.get('user-agent');
  const referer = req.headers.get('referer');
  const device = parseDevice(userAgent);
  const referrer = normalizeReferrer(referer, getBaseUrl());

  await Event.create({ type: 'click', url, page, device, referrer });
  return Response.json(true);
};
