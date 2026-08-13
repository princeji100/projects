import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";
import connectToDatabase from "@/lib/connectToDB";
import AllowedUser from "@/models/AllowedUser";

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      // Include both id and email in session
      session.user.id = user.id;
      session.user.email = user.email;
      return session;
    },
    // D-01: invite-only. Anything absent from AllowedUser is refused here.
    // Returning false is what produces ?error=AccessDenied — v4's documented behaviour.
    // Raising an exception instead is undocumented in v4 and unverified; do not switch.
    //
    // ponytail: signIn fires at login, not per request, and the adapter uses database
    // sessions — so removing an email from the allowlist does NOT evict a live session.
    // Insert-only in Phase 1 (D-05), so it cannot bite yet; Phase 1.5's remove-email UI
    // must delete that user's `sessions` rows or the removal is cosmetic.
    async signIn({ user, account, profile }) {
      if (!user?.email) {
        return false;
      }
      try {
        await connectToDatabase();
        const allowed = await AllowedUser.findOne({ email: user.email.toLowerCase() });
        return Boolean(allowed);
      } catch (err) {
        // Fail CLOSED — deliberately the opposite of the rate limiter's fail-open
        // (lib/rateLimit.js). A limiter blip must not break the app; an allowlist blip
        // must not admit a stranger. Wrong-direction failure costs differently here.
        console.error('signIn allowlist lookup failed, refusing sign-in:', err);
        return false;
      }
    },
  },
  // AccessDenied lands on the ERROR page, not the sign-in page, so both must point at
  // /login or the refusal renders NextAuth's default error screen (D-03).
  pages: { signIn: '/login', error: '/login' },
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };