// =============================================================================
// ATTENDING AI - Patient Portal Middleware
// apps/patient-portal/middleware.ts
//
// Selectively protects patient-facing pages with NextAuth session enforcement.
//
// CRITICAL DISTINCTION:
//   The patient portal has TWO categories of users:
//     1. Pre-visit patients — arrive via appointment link, NO account required.
//        They go straight to /compass or /chat to complete their assessment.
//     2. Registered patients — have accounts and access their health dashboard,
//        records, and lab results.
//
// This middleware enforces auth only for registered-patient routes so that
// pre-visit patients are never blocked from completing their COMPASS assessment.
//
// PUBLIC PATHS (no auth required):
//   /                  — landing page
//   /compass/*         — pre-visit assessment landing + verification
//   /chat/*            — COMPASS chat interface (pre-visit flow)
//   /offline           — offline fallback page
//   /auth/*            — NextAuth routes
//   /api/auth/*        — NextAuth API routes
//   /api/compass/*     — COMPASS verification API (used by unauthenticated patients)
//   /api/assessments/* — assessment submit/sync (called by chat store, no session)
//   /_next/*           — static assets
//
// PROTECTED PATHS (requires session):
//   /dashboard         — patient health dashboard
//   /profile           — patient profile
//   /health-summary    — health records
//   /care-resources    — care resource library
//   /companion         — AI companion
//   /results/*         — lab/imaging results
//   /emergency-*       — emergency settings / emergency access
// =============================================================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDevelopment = process.env.NODE_ENV === 'development';
const enforceInDev = process.env.NEXTAUTH_ENFORCE === 'true';

export default withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Development bypass: allow all unless explicitly enforced.
        if (isDevelopment && !enforceInDev) {
          return true;
        }
        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

// Only enforce auth on explicitly private patient routes.
// /compass, /chat, and all API routes used by the pre-visit flow remain open.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/health-summary/:path*',
    '/care-resources/:path*',
    '/companion/:path*',
    '/results/:path*',
    '/emergency-access/:path*',
    '/emergency-settings/:path*',
  ],
};
