// ============================================================
// NextAuth API Route - Provider Portal
// apps/provider-portal/pages/api/auth/[...nextauth].ts
//
// Phase 3: Inline config using CredentialsProvider for dev.
// Production will use Azure AD / SSO via shared auth module.
// ============================================================

import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@attending/shared/lib/prisma';

const isDev = process.env.NODE_ENV === 'development';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Development Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'dr.smith@hospital.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // In dev, auto-authenticate any user that exists in the DB
        if (isDev) {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            };
          }

          // In dev, also allow the seeded demo provider
          if (credentials.email === 'scott.isbell@attending.ai') {
            const provider = await prisma.user.findFirst({
              where: { email: 'scott.isbell@attending.ai' },
            });
            if (provider) {
              return {
                id: provider.id,
                email: provider.email,
                name: provider.name,
                role: provider.role,
              };
            }
          }
        }

        // Production: validate password hash (TODO: implement bcrypt check)
        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  secret: process.env.NEXTAUTH_SECRET || (isDev ? 'dev-secret-not-for-production' : undefined),
};

export default NextAuth(authOptions);
