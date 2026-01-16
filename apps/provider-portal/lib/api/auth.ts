// NextAuth Configuration
// apps/provider-portal/lib/api/auth.ts

import type { NextAuthOptions, User } from 'next-auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { prisma } from '@attending/shared/lib/prisma';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string;
      role: string;
      specialty?: string;
      npi?: string;
    };
  }
  interface User {
    id: string;
    role: string;
    specialty?: string;
    npi?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    specialty?: string;
    npi?: string;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8-hour clinical shift
  },
  
  providers: [
    // Azure AD for enterprise healthcare organizations
    ...(process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET ? [
      AzureADProvider({
        clientId: process.env.AZURE_AD_CLIENT_ID,
        clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
        tenantId: process.env.AZURE_AD_TENANT_ID,
        authorization: {
          params: {
            scope: 'openid email profile User.Read',
          },
        },
      }),
    ] : []),
    
    // Credentials for development and fallback
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'provider@clinic.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Development bypass - allows any email with password 'password'
        if (process.env.DEV_BYPASS_AUTH === 'true' && credentials.password === 'password') {
          return {
            id: 'dev-provider-001',
            email: credentials.email,
            name: 'Dr. Dev Provider',
            role: 'PROVIDER',
            specialty: 'Family Medicine',
          };
        }

        // In development without DEV_BYPASS_AUTH, still allow password='password' for testing
        if (process.env.NODE_ENV === 'development' && credentials.password === 'password') {
          // Try to find user in database first
          try {
            const user = await prisma.user.findUnique({
              where: { email: credentials.email },
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                specialty: true,
                npi: true,
                isActive: true,
              },
            });

            if (user && user.isActive) {
              await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() },
              });

              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                specialty: user.specialty || undefined,
                npi: user.npi || undefined,
              };
            }
          } catch (error) {
            console.error('Database lookup error:', error);
          }

          // Fallback to mock user for development
          return {
            id: 'dev-provider-001',
            email: credentials.email,
            name: 'Dr. Dev Provider',
            role: 'PROVIDER',
            specialty: 'Family Medicine',
          };
        }

        // Production: require proper password validation
        // TODO: Install bcryptjs and implement proper password hashing
        // For now, reject in production if no DEV_BYPASS_AUTH
        console.warn('[Auth] Production password validation not implemented');
        return null;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.specialty = user.specialty;
        token.npi = user.npi;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.specialty = token.specialty;
        session.user.npi = token.npi;
      }
      return session;
    },

    async signIn({ user, account, profile }) {
      // For Azure AD, create/update user in our database
      if (account?.provider === 'azure-ad' && profile?.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
          });

          if (!existingUser) {
            await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name || profile.email,
                role: 'PROVIDER',
                isActive: true,
              },
            });
          }
        } catch (error) {
          console.error('Error creating user from Azure AD:', error);
        }
      }
      return true;
    },
  },

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },

  events: {
    async signIn({ user }) {
      try {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'LOGIN',
            entityType: 'User',
            entityId: user.id,
            success: true,
          },
        });
      } catch (error) {
        console.error('Audit log error:', error);
      }
    },
    async signOut({ token }) {
      if (token?.id) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: token.id as string,
              action: 'LOGOUT',
              entityType: 'User',
              entityId: token.id as string,
              success: true,
            },
          });
        } catch (error) {
          console.error('Audit log error:', error);
        }
      }
    },
  },
};

// Helper to get session in API routes
export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  return getServerSession(req, res, authOptions);
}

// Middleware to require authentication
export function requireAuth(
  handler: (req: NextApiRequest, res: NextApiResponse, session: any) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return handler(req, res, session);
  };
}

// Middleware to require specific role
export function requireRole(roles: string[]) {
  return (handler: (req: NextApiRequest, res: NextApiResponse, session: any) => Promise<void>) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const session = await getSession(req, res);
      
      if (!session) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!roles.includes(session.user.role)) {
        return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      }
      
      return handler(req, res, session);
    };
  };
}

// Audit logging helper
export async function createAuditLog(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  changes?: any,
  req?: NextApiRequest
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        changes,
        ipAddress: req?.headers['x-forwarded-for']?.toString() || req?.socket?.remoteAddress,
        userAgent: req?.headers['user-agent'],
        success: true,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
