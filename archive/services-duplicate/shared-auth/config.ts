// ============================================================
// Authentication Configuration - @attending/shared
// apps/shared/auth/config.ts
//
// NextAuth.js configuration for ATTENDING AI Platform
// Supports: Azure AD B2C, Credentials (dev only)
// ============================================================

import type { NextAuthOptions, User, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import type { OAuthConfig } from 'next-auth/providers/oauth';
import CredentialsProvider from 'next-auth/providers/credentials';

// ============================================================
// TYPES
// ============================================================

export interface AttendingUser extends User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'PROVIDER' | 'NURSE' | 'STAFF' | 'PATIENT';
  providerId?: string;
  patientId?: string;
  specialty?: string;
  npi?: string;
}

export interface AttendingSession extends Session {
  user: AttendingUser;
  accessToken?: string;
  idToken?: string;
}

export interface AttendingJWT extends JWT {
  role: AttendingUser['role'];
  providerId?: string;
  patientId?: string;
  specialty?: string;
  npi?: string;
  accessToken?: string;
  idToken?: string;
}

// ============================================================
// DEV USERS (for development/testing only)
// ============================================================

const DEV_USERS: Record<string, AttendingUser> = {
  'provider@attending.dev': {
    id: 'dev-provider-001',
    email: 'provider@attending.dev',
    name: 'Dr. Sarah Chen',
    role: 'PROVIDER',
    providerId: 'dev-provider-001',
    specialty: 'Family Medicine',
    npi: '1234567890',
  },
  'nurse@attending.dev': {
    id: 'dev-nurse-001',
    email: 'nurse@attending.dev',
    name: 'Nurse Jackie Smith',
    role: 'NURSE',
  },
  'admin@attending.dev': {
    id: 'dev-admin-001',
    email: 'admin@attending.dev',
    name: 'Admin User',
    role: 'ADMIN',
  },
  'patient@attending.dev': {
    id: 'dev-patient-001',
    email: 'patient@attending.dev',
    name: 'John Patient',
    role: 'PATIENT',
    patientId: 'dev-patient-001',
  },
};

// ============================================================
// AZURE AD B2C PROVIDER CONFIGURATION
// ============================================================

interface AzureB2CProfile {
  sub: string;
  name?: string;
  email?: string;
  emails?: string[];
  given_name?: string;
  family_name?: string;
  extension_Role?: string;
  extension_NPI?: string;
  extension_Specialty?: string;
  jobTitle?: string;
}

/**
 * Create Azure AD B2C provider for staff (providers, nurses, admin)
 */
function createAzureADB2CStaffProvider(): OAuthConfig<AzureB2CProfile> | null {
  const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
  const clientId = process.env.AZURE_AD_B2C_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_B2C_CLIENT_SECRET;
  const userFlow = process.env.AZURE_AD_B2C_PRIMARY_USER_FLOW || 'B2C_1_SignUpSignIn';

  // Return null if not configured
  if (!tenantName || !clientId || !clientSecret) {
    console.log('[Auth] Azure AD B2C not configured for staff portal');
    return null;
  }

  const issuer = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${userFlow}/v2.0`;

  return {
    id: 'azure-ad-b2c',
    name: 'ATTENDING SSO',
    type: 'oauth',
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: 'openid profile email offline_access',
        response_type: 'code',
        response_mode: 'query',
      },
    },
    idToken: true,
    checks: ['pkce', 'state'],
    clientId,
    clientSecret,
    profile(profile: AzureB2CProfile) {
      // Map Azure AD B2C profile to AttendingUser
      const email = profile.email || profile.emails?.[0] || '';
      const name = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim();
      
      // Determine role from custom attribute or job title
      let role: AttendingUser['role'] = 'STAFF';
      const roleAttr = profile.extension_Role?.toUpperCase();
      if (roleAttr === 'ADMIN' || roleAttr === 'PROVIDER' || roleAttr === 'NURSE' || roleAttr === 'STAFF') {
        role = roleAttr as AttendingUser['role'];
      } else if (profile.jobTitle?.toLowerCase().includes('physician') || profile.jobTitle?.toLowerCase().includes('doctor')) {
        role = 'PROVIDER';
      } else if (profile.jobTitle?.toLowerCase().includes('nurse')) {
        role = 'NURSE';
      }

      return {
        id: profile.sub,
        email,
        name,
        role,
        providerId: role === 'PROVIDER' ? profile.sub : undefined,
        specialty: profile.extension_Specialty,
        npi: profile.extension_NPI,
      };
    },
  };
}

/**
 * Create Azure AD B2C provider for patients
 */
function createAzureADB2CPatientProvider(): OAuthConfig<AzureB2CProfile> | null {
  const tenantName = process.env.AZURE_AD_B2C_TENANT_NAME;
  const clientId = process.env.AZURE_AD_B2C_PATIENT_CLIENT_ID || process.env.AZURE_AD_B2C_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_B2C_PATIENT_CLIENT_SECRET || process.env.AZURE_AD_B2C_CLIENT_SECRET;
  const userFlow = process.env.AZURE_AD_B2C_PATIENT_USER_FLOW || 'B2C_1_PatientSignUpSignIn';

  // Return null if not configured
  if (!tenantName || !clientId || !clientSecret) {
    console.log('[Auth] Azure AD B2C not configured for patient portal');
    return null;
  }

  const issuer = `https://${tenantName}.b2clogin.com/${tenantName}.onmicrosoft.com/${userFlow}/v2.0`;

  return {
    id: 'azure-ad-b2c-patient',
    name: 'Patient Login',
    type: 'oauth',
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: 'openid profile email',
        response_type: 'code',
        response_mode: 'query',
      },
    },
    idToken: true,
    checks: ['pkce', 'state'],
    clientId,
    clientSecret,
    profile(profile: AzureB2CProfile) {
      const email = profile.email || profile.emails?.[0] || '';
      const name = profile.name || `${profile.given_name || ''} ${profile.family_name || ''}`.trim();

      return {
        id: profile.sub,
        email,
        name,
        role: 'PATIENT' as const,
        patientId: profile.sub,
      };
    },
  };
}

// ============================================================
// PROVIDER PORTAL AUTH OPTIONS
// ============================================================

export function createProviderAuthOptions(prisma?: any): NextAuthOptions {
  const providers: NextAuthOptions['providers'] = [];

  // Add Azure AD B2C if configured
  const azureProvider = createAzureADB2CStaffProvider();
  if (azureProvider) {
    providers.push(azureProvider);
  }

  // Add Credentials provider for development
  if (process.env.NODE_ENV === 'development' || process.env.DEV_BYPASS_AUTH === 'true') {
    providers.push(
      CredentialsProvider({
        id: 'credentials',
        name: 'Development Login',
        credentials: {
          email: { label: 'Email', type: 'email', placeholder: 'provider@attending.dev' },
          password: { label: 'Password', type: 'password', placeholder: 'password' },
        },
        async authorize(credentials) {
          const email = credentials?.email?.toLowerCase();
          const password = credentials?.password;

          // Dev password is 'password' for all dev users
          if (email && password === 'password' && DEV_USERS[email]) {
            const user = DEV_USERS[email];
            // Only allow provider roles for provider portal
            if (['ADMIN', 'PROVIDER', 'NURSE', 'STAFF'].includes(user.role)) {
              return user;
            }
          }

          // Check database for real users (if prisma provided)
          if (prisma && credentials?.email) {
            try {
              const dbUser = await prisma.user.findUnique({
                where: { email: credentials.email.toLowerCase() },
              });
              if (dbUser && dbUser.role !== 'PATIENT') {
                return {
                  id: dbUser.id,
                  email: dbUser.email,
                  name: dbUser.name,
                  role: dbUser.role,
                  providerId: dbUser.id,
                  specialty: dbUser.specialty,
                  npi: dbUser.npi,
                } as AttendingUser;
              }
            } catch (error) {
              console.error('Auth error:', error);
            }
          }

          return null;
        },
      })
    );
  }

  return {
    providers,

    callbacks: {
      async jwt({ token, user, account }): Promise<AttendingJWT> {
        // Initial sign in
        if (user) {
          const attendingUser = user as AttendingUser;
          token.role = attendingUser.role;
          token.providerId = attendingUser.providerId;
          token.specialty = attendingUser.specialty;
          token.npi = attendingUser.npi;
        }

        // Store tokens from OAuth provider
        if (account) {
          token.accessToken = account.access_token;
          token.idToken = account.id_token;
        }

        return token as AttendingJWT;
      },

      async session({ session, token }): Promise<AttendingSession> {
        const attendingToken = token as AttendingJWT;
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub || '',
            role: attendingToken.role,
            providerId: attendingToken.providerId,
            specialty: attendingToken.specialty,
            npi: attendingToken.npi,
          },
          accessToken: attendingToken.accessToken,
          idToken: attendingToken.idToken,
        } as AttendingSession;
      },

      async signIn({ user, account, profile }) {
        // Additional validation can go here
        // For example, check if the user exists in your database
        return true;
      },

      async redirect({ url, baseUrl }) {
        // Allow relative callback URLs
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        // Allow callback URLs on the same origin
        if (new URL(url).origin === baseUrl) return url;
        return baseUrl;
      },
    },

    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },

    session: {
      strategy: 'jwt',
      maxAge: 8 * 60 * 60, // 8 hours
    },

    events: {
      async signIn({ user, account, isNewUser }) {
        console.log(`[Auth] User signed in: ${user.email} (new: ${isNewUser})`);
      },
      async signOut({ token }) {
        console.log(`[Auth] User signed out: ${token.email}`);
      },
    },

    debug: process.env.NODE_ENV === 'development',
  };
}

// ============================================================
// PATIENT PORTAL AUTH OPTIONS
// ============================================================

export function createPatientAuthOptions(prisma?: any): NextAuthOptions {
  const providers: NextAuthOptions['providers'] = [];

  // Add Azure AD B2C patient provider if configured
  const azureProvider = createAzureADB2CPatientProvider();
  if (azureProvider) {
    providers.push(azureProvider);
  }

  // Add Credentials provider for development/guest access
  providers.push(
    CredentialsProvider({
      id: 'credentials',
      name: 'Continue as Guest',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'patient@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Allow guest/anonymous access in development
        if (process.env.DEV_BYPASS_AUTH === 'true') {
          if (!credentials?.email || credentials.email === 'guest' || credentials.email === '') {
            return {
              id: `guest-${Date.now()}`,
              email: 'guest@attending.dev',
              name: 'Guest Patient',
              role: 'PATIENT',
              patientId: `guest-${Date.now()}`,
            } as AttendingUser;
          }
        }

        const email = credentials?.email?.toLowerCase();
        const password = credentials?.password;

        // Dev password check
        if (email && password === 'password' && DEV_USERS[email]) {
          const user = DEV_USERS[email];
          if (user.role === 'PATIENT') {
            return user;
          }
        }

        // Check database for patient
        if (prisma && credentials?.email) {
          try {
            const patient = await prisma.patient.findFirst({
              where: { email: credentials.email.toLowerCase() },
            });
            if (patient) {
              return {
                id: patient.id,
                email: patient.email || credentials.email,
                name: `${patient.firstName} ${patient.lastName}`,
                role: 'PATIENT',
                patientId: patient.id,
              } as AttendingUser;
            }
          } catch (error) {
            console.error('Auth error:', error);
          }
        }

        return null;
      },
    })
  );

  return {
    providers,

    callbacks: {
      async jwt({ token, user, account }): Promise<AttendingJWT> {
        if (user) {
          const attendingUser = user as AttendingUser;
          token.role = attendingUser.role;
          token.patientId = attendingUser.patientId;
        }

        if (account) {
          token.accessToken = account.access_token;
          token.idToken = account.id_token;
        }

        return token as AttendingJWT;
      },

      async session({ session, token }): Promise<AttendingSession> {
        const attendingToken = token as AttendingJWT;
        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub || '',
            role: attendingToken.role,
            patientId: attendingToken.patientId,
          },
          accessToken: attendingToken.accessToken,
          idToken: attendingToken.idToken,
        } as AttendingSession;
      },
    },

    pages: {
      signIn: '/auth/signin',
      error: '/auth/error',
    },

    session: {
      strategy: 'jwt',
      maxAge: 24 * 60 * 60, // 24 hours for patients
    },

    debug: process.env.NODE_ENV === 'development',
  };
}

// ============================================================
// DEFAULT EXPORT (Provider portal config)
// ============================================================

export const authOptions = createProviderAuthOptions();
