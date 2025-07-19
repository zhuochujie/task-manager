import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcrypt';

// A custom type for the user object from your database
interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password || !process.env.DATABASE_URL) {
          return null;
        }

        const sql = neon(process.env.DATABASE_URL);

        try {
          // Find the user in the database
          const users = (await sql`
            SELECT id, email, "passwordHash" FROM "User" WHERE email = ${credentials.email};
          `) as User[];
          
          const user = users[0];

          if (!user) {
            console.log("No user found with that email.");
            return null;
          }

          // Check if the password is correct
          const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

          if (!isValid) {
            console.log("Password does not match.");
            return null;
          }

          // Return a simplified user object for the session
          return {
            id: user.id,
            email: user.email,
          };

        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    // Add user ID to the session token
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // Add user ID to the session object
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login', // Redirect users to a custom login page
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

