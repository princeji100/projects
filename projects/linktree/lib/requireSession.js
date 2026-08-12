import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// D-30: a shared lib/ helper called explicitly from each write path, not middleware.
//
// Returns the session or null. It deliberately does NOT throw and does NOT build a
// Response: route handlers need a 401 Response while server actions need a returned
// object, so the refusal shape belongs to the caller.
export async function requireSession() {
    const session = await getServerSession(authOptions);
    return session?.user?.email ? session : null;
}
