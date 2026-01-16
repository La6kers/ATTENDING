// ============================================================
// NextAuth API Route - Provider Portal
// apps/provider-portal/pages/api/auth/[...nextauth].ts
//
// Handles authentication for the provider portal
// ============================================================

import NextAuth from 'next-auth';
import { createProviderAuthOptions } from '@attending/shared/auth';
import { prisma } from '@attending/shared/lib/prisma';

const authOptions = createProviderAuthOptions(prisma);

export default NextAuth(authOptions);

// Export for use in other API routes
export { authOptions };
