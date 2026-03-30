// ============================================================
// NextAuth Configuration — Provider Portal
// apps/provider-portal/pages/api/auth/[...nextauth].ts
//
// Authentication strategy:
//   Development  → CredentialsProvider (email only, seeded users, no password)
//   Production   → Azure AD B2C (OIDC via ssoProviders helper)
//
// The provider used is determined at runtime from environment variables.
// If AZURE_AD_B2C_TENANT + AZURE_AD_B2C_CLIENT_ID are set, Azure AD B2C
// is used regardless of NODE_ENV. This lets staging environments use B2C
// while local dev continues to use credentials.
//
// Post-login:
//   - User.isActive is checked on every JWT refresh (session revocation)
//   - organizationId and role are embedded in the JWT for downstream use
// ============================================================

import NextAuth, { type NextAuthOptions, type User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@attending/shared/lib/prisma';
import { buildNextAuthProviders } from '@attending/shared/lib/auth/ssoProviders';
import type { SSOProviderConfig } from '@attending/shared/lib/auth/ssoProviders';
import { hashData, verifyHash } from '@attending/shared/lib/security';

// ============================================================
// Runtime environment detection
// ============================================================

const isDev = process.env.NODE_ENV === 'development';

const b2cTenant     = process.env.AZURE_AD_B2C_TENANT;
const b2cClientId   = process.env.AZURE_AD_B2C_CLIENT_ID;
const b2cSecret     = process.env.AZURE_AD_B2C_CLIENT_SECRET;
const b2cUserFlow   = process.env.AZURE_AD_B2C_USER_FLOW || 'B2C_1_signupsignin1';

// Azure AD B2C is active when all three required env vars are present
const useAzureB2C = !!(b2cTenant && b2cClientId && b2cSecret);

// ============================================================
// Build provider list
// ============================================================

function buildProviders() {
  // --- Production / staging: Azure AD B2C ---
  if (useAzureB2C) {
    const b2cConfig: SSOProviderConfig = {
      id: 'azure-b2c-default',
      name: 'ATTENDING AI',
      protocol: 'azure-ad-b2c',
      organizationId: null,
      isActive: true,
      azureAdB2c: {
        tenantName: b2cTenant!,
        clientId: b2cClientId!,
        clientSecret: b2cSecret!,
        primaryUserFlow: b2cUserFlow,
      },
      // Map B2C roles claim → ATTENDING roles
      roleMapping: {
        physician: 'PROVIDER',
        Physician: 'PROVIDER',
        nurse: 'NURSE',
        Nurse: 'NURSE',
        admin: 'ADMIN',
        Admin: 'ADMIN',
        staff: 'STAFF',
        Staff: 'STAFF',
      },
    };
    return buildNextAuthProviders([b2cConfig]);
  }

  // --- Credentials provider (all environments without B2C) ---
  // Phase 0 hardening: password is required in all environments.
  // Passwords are SHA-256 hashed and stored in the user's password field.
  // First login with no stored password: the provided password is hashed
  // and saved for future logins (bootstrap flow).
  return [
    CredentialsProvider({
      id: 'dev-credentials',
      name: 'ATTENDING Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'scott.isbell@attending.ai' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            organizationId: true,
            password: true,
          },
        });

        if (!user || !user.isActive) return null;

        // Verify password: PBKDF2 with salt (100,000 iterations, SHA-512)
        if (user.password) {
          // User has a stored password hash — verify
          if (!verifyHash(credentials.password, user.password)) return null;
        } else {
          // No password stored yet — accept the provided password
          // and store its PBKDF2 hash for future logins (first-login bootstrap).
          try {
            const hashedPassword = hashData(credentials.password);
            await prisma.user.update({
              where: { id: user.id },
              data: { password: hashedPassword },
            });
          } catch {
            // DB write failed — still allow this login, hash will be set next time
          }
        }

        return {
          id: user.id,
          email: user.email ?? '',
          name: user.name ?? '',
          role: user.role,
          organizationId: user.organizationId ?? '',
        } as User & { role: string; organizationId: string };
      },
    }),
  ];
}

// ============================================================
// NextAuth options
// ============================================================

export const authOptions: NextAuthOptions = {
  providers: buildProviders(),

  callbacks: {
    // ── JWT callback ──────────────────────────────────────────
    // Runs on every token creation and refresh.
    // isActive check here enforces session revocation:
    // if a user's account is deactivated between sessions, they
    // are signed out on the next token refresh (up to maxAge).
    async jwt({ token, user, account }) {
      // Initial sign-in: embed identifiers from the user object
      if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'STAFF';
        token.organizationId = (user as any).organizationId ?? null;
      }

      // For Azure AD B2C tokens, extract claims from the id_token
      // Safety note: The manual base64 decode below is safe because NextAuth
      // has already validated the JWT signature via the OIDC provider before
      // this callback fires. We are only extracting claims from an already-
      // verified token — not performing authentication based on raw input.
      if (account?.provider?.startsWith('azure-ad-b2c') && account.id_token) {
        try {
          const claims = JSON.parse(
            Buffer.from(account.id_token.split('.')[1], 'base64').toString()
          );
          token.role = mapB2CRole(claims) ?? token.role ?? 'STAFF';
          // oid is the stable Azure AD object ID
          if (claims.oid) token.id = claims.oid;
        } catch {
          // id_token decode failure is non-fatal — role falls back to STAFF
        }
      }

      // Session revocation: on every refresh check isActive in DB.
      // Skip in dev to avoid DB hit on every request during hot reloads.
      if (!isDev && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { isActive: true, role: true, organizationId: true },
          });
          if (!dbUser || !dbUser.isActive) {
            // Returning null from jwt() signs the user out
            return null as any;
          }
          // Keep role/org in sync with DB in case they were updated
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
        } catch {
          // DB unavailable — allow token to pass (fail open on DB errors
          // rather than locking out all users during an outage)
        }
      }

      return token;
    },

    // ── Session callback ──────────────────────────────────────
    // Exposes token fields to the client-side session object.
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id             = token.id;
        (session.user as any).role           = token.role;
        (session.user as any).organizationId = token.organizationId;
      }
      return session;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error:  '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — matches clinical shift length
  },

  // NEXTAUTH_SECRET is required. No fallback — missing secret means
  // misconfigured deployment and must fail loudly.
  secret: process.env.NEXTAUTH_SECRET,

  // Detailed error logging in dev; terse in production
  debug: isDev,
};

// ============================================================
// Helpers
// ============================================================

function mapB2CRole(claims: Record<string, unknown>): string | null {
  const roleClaim =
    claims['extension_role'] ||
    claims['roles'] ||
    claims['role'];

  if (!roleClaim) return null;

  const roles = Array.isArray(roleClaim) ? roleClaim : [String(roleClaim)];
  const priority = ['ADMIN', 'PROVIDER', 'NURSE', 'STAFF'];

  for (const p of priority) {
    if (roles.some(r => String(r).toUpperCase() === p)) return p;
  }

  return 'STAFF';
}

export default NextAuth(authOptions);
