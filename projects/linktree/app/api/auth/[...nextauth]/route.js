import NextAuth from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/db";
import GoogleProvider from "next-auth/providers/google";

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
    // Add signIn callback for additional security
    async signIn({ user, account, profile }) {
      if (user.email) {
        return true;
      }
      return false;
    },
  },
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };