// ============================================================
// NextAuth API Route - Patient Portal
// apps/patient-portal/pages/api/auth/[...nextauth].ts
//
// Phase 3: Inline config. Patient portal uses anonymous/guest
// sessions for COMPASS — no login required for assessments.
// ============================================================

import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import crypto from 'crypto';

const isDev = process.env.NODE_ENV === 'development';
const isDemo = process.env.DEMO_MODE === 'true';

// Ephemeral secret for dev/demo — regenerated each process start so it
// cannot be predicted from the file system path.
let _ephemeralDevSecret: string | undefined;

/**
 * Get the NextAuth secret.
 * - In production: MUST be set via NEXTAUTH_SECRET env var
 * - In dev/demo: generates a random per-process secret
 */
function getNextAuthSecret(): string | undefined {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET;
  }

  if (isDev || isDemo) {
    if (!_ephemeralDevSecret) {
      _ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
      console.warn(
        '[NextAuth] Using ephemeral dev secret. Set NEXTAUTH_SECRET in .env.local for persistent sessions.'
      );
    }
    return _ephemeralDevSecret;
  }

  // Production without secret — NextAuth will throw an error
  return undefined;
}

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
        if ((isDev || isDemo) && credentials?.email) {
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

  secret: getNextAuthSecret(),
};

export default NextAuth(authOptions);
