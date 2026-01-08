// ============================================================
// NextAuth API Route - Patient Portal
// apps/patient-portal/pages/api/auth/[...nextauth].ts
//
// Handles authentication for the patient portal (COMPASS)
// ============================================================

import NextAuth from 'next-auth';
import { createPatientAuthOptions } from '@attending/shared/auth';
import { prisma } from '@attending/shared/lib/prisma';

const authOptions = createPatientAuthOptions(prisma);

export default NextAuth(authOptions);

// Export for use in other API routes
export { authOptions };
