// NextAuth Configuration
// apps/provider-portal/lib/api/auth.ts

import type { NextAuthOptions, User } from 'next-auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

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
  adapter: PrismaAdapter(prisma) as any,
  
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8-hour clinical shift
  },
  
  providers: [
    // Azure AD for enterprise healthcare organizations
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: 'openid email profile User.Read',
        },
      },
    }),
    
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

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            password: true,
            role: true,
            specialty: true,
            npi: true,
            isActive: true,
          },
        });

        if (!user || !user.password || !user.isActive) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);

        if (!isValidPassword) {
          return null;
        }

        // Update last login
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
      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          entityType: 'User',
          entityId: user.id,
          success: true,
        },
      });
    },
    async signOut({ token }) {
      if (token?.id) {
        await prisma.auditLog.create({
          data: {
            userId: token.id as string,
            action: 'LOGOUT',
            entityType: 'User',
            entityId: token.id as string,
            success: true,
          },
        });
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
}
