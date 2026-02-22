// ============================================================
// NextAuth API Route - Patient Portal
// apps/patient-portal/pages/api/auth/[...nextauth].ts
//
// Phase 3: Inline config. Patient portal uses anonymous/guest
// sessions for COMPASS — no login required for assessments.
// ============================================================

import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const isDev = process.env.NODE_ENV === 'development';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Patient Login',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Patient portal COMPASS works without auth (anonymous assessments).
        // This provider exists for future patient account features.
        if (isDev && credentials?.email) {
          return {
            id: `patient-${Date.now()}`,
            email: credentials.email,
            name: 'Patient User',
          };
        }
        return null;
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET || (isDev ? 'dev-secret-not-for-production' : undefined),
};

export default NextAuth(authOptions);
