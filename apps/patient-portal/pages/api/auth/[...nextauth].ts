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

// CMS HTE: ID.me IAL2 identity verification provider
// See: packages/identity for full IAL2 implementation
// ID.me OIDC integration for Medicare App Library compliance
const IDME_ENABLED = !!process.env.IDME_CLIENT_ID;
const IDME_SANDBOX = process.env.IDME_USE_SANDBOX === 'true';
const IDME_ISSUER = IDME_SANDBOX
  ? 'https://api.idmelabs.com/oidc'
  : 'https://api.id.me/oidc';

// TODO(AZURE-KEY-VAULT): In production, NEXTAUTH_SECRET and any other sensitive
// environment variables should be sourced from Azure Key Vault rather than
// plain App Service configuration or .env files.
// Options:
//   1. Azure App Service Key Vault references:
//      Set the env var value to "@Microsoft.KeyVault(SecretUri=https://...)"
//      in App Service Configuration — Azure resolves it automatically at startup.
//   2. Azure SDK (@azure/keyvault-secrets + @azure/identity) in a startup
//      script to populate process.env before this file is imported.
// See: https://learn.microsoft.com/azure/app-service/app-service-key-vault-references
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET environment variable is required in production');
}

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

// Build ID.me OIDC provider for NextAuth (CMS HTE requirement)
function getIdmeProvider() {
  if (!IDME_ENABLED) return null;
  return {
    id: 'idme',
    name: 'ID.me',
    type: 'oauth' as const,
    wellKnown: `${IDME_ISSUER}/.well-known/openid-configuration`,
    clientId: process.env.IDME_CLIENT_ID!,
    clientSecret: process.env.IDME_CLIENT_SECRET!,
    authorization: {
      params: {
        scope: 'openid profile email http://idmanagement.gov/ns/assurance/ial/2',
        response_type: 'code',
      },
    },
    idToken: true,
    checks: ['state', 'nonce'] as const,
    profile(profile: any) {
      return {
        id: profile.sub,
        name: [profile.fname, profile.lname].filter(Boolean).join(' ') || profile.email,
        email: profile.email,
        image: null,
        // CMS HTE: Store IAL level and verification status
        ialLevel: profile.ial || 'IAL1',
        verified: profile.verified || false,
        identityProvider: 'idme' as const,
      };
    },
  };
}

const idmeProvider = getIdmeProvider();

export const authOptions: NextAuthOptions = {
  providers: [
    // CMS HTE: ID.me IAL2 identity verification (when configured)
    ...(idmeProvider ? [idmeProvider] : []),
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

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // CMS HTE: Carry IAL2 identity verification data in JWT
        if ((user as any).ialLevel) {
          token.ialLevel = (user as any).ialLevel;
          token.identityVerified = (user as any).verified;
          token.identityProvider = (user as any).identityProvider;
        }
      }
      // Store ID.me access token for FHIR data retrieval
      if (account?.provider === 'idme') {
        token.idmeAccessToken = account.access_token;
        token.idmeRefreshToken = account.refresh_token;
        token.identityProvider = 'idme';
      }
      // Embed organizationId from environment for patient portal sessions
      token.organizationId = process.env.DEFAULT_ORGANIZATION_ID || null;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).organizationId = token.organizationId;
        // CMS HTE: Expose IAL2 status in session for client-side checks
        (session.user as any).identityVerification = {
          ialLevel: token.ialLevel || null,
          verified: token.identityVerified || false,
          provider: token.identityProvider || null,
        };
      }
      return session;
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },

  secret: getNextAuthSecret(),
};

export default NextAuth(authOptions);
