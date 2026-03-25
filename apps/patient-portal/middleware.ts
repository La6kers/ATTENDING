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
//   === Rebrand (current) ===
//   /home              — patient health dashboard
//   /health/*          — health records
//   /messages/*        — secure messaging
//   /emergency/*       — emergency settings, crash settings, contacts, history
//   /notifications     — notification center
//   /companion         — AI health companion
//   /profile/*         — patient profile
//   === Legacy (pre-rebrand, still present) ===
//   /dashboard         — old patient dashboard
//   /health-summary    — old health records page
//   /care-resources    — care resource library
//   /results/*         — lab/imaging results
//   /emergency-access  — old emergency access page
//   /emergency-settings — old emergency settings page
// =============================================================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth is enforced on all matched routes in ALL environments.
// Pre-visit routes (/compass, /chat) are excluded via the matcher config below.
//
// DEV NOTE: There is no dev bypass — developers must authenticate even locally.
// The NextAuth secret is ephemeral (regenerated each process restart), so sessions
// are invalidated on server restart. Use the /auth/signin flow to re-authenticate.
// This is intentional: auth bypass in dev hides real auth bugs.

export default withAuth(
  function middleware(req: NextRequest) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
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
    // === Rebrand routes (current) ===
    '/home',
    '/health/:path*',
    '/messages/:path*',
    '/emergency/:path*',
    '/notifications',
    '/companion',
    '/profile/:path*',

    // === Legacy routes (pre-rebrand, still accessible) ===
    '/dashboard',
    '/health-summary',
    '/care-resources',
    '/results/:path*',
    '/emergency-access/:path*',
    '/emergency-settings/:path*',
  ],
};
