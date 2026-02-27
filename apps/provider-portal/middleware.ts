// =============================================================================
// ATTENDING AI - Provider Portal Middleware
// apps/provider-portal/middleware.ts
//
// Protects all provider-facing pages with NextAuth session enforcement.
//
// BEHAVIOR BY ENVIRONMENT:
//   development  — skips auth check unless NEXTAUTH_ENFORCE=true is set.
//                  This keeps the local dev loop intact when Azure AD B2C
//                  credentials aren't configured yet.
//   production   — always requires a valid NextAuth session token.
//                  Unauthenticated requests are redirected to /auth/signin.
//
// PUBLIC PATHS (never protected):
//   /auth/*          — sign-in, sign-out, error, callback routes
//   /api/auth/*      — NextAuth API routes
//   /api/health      — health check for uptime monitoring
//   /_next/*         — Next.js static assets
//   /favicon.ico     — browser favicon
//   /sounds/*        — clinical alert audio files
//   /icons/*         — PWA icon assets
// =============================================================================

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDevelopment = process.env.NODE_ENV === 'development';
const enforceInDev = process.env.NEXTAUTH_ENFORCE === 'true';

export default withAuth(
  // Middleware function runs AFTER the authorized callback returns true.
  // Add request-level logic here (e.g. role checks, tenant injection).
  function middleware(req: NextRequest) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // In development without explicit enforcement, allow all requests.
        // This lets developers use the portal without configuring Azure AD B2C.
        if (isDevelopment && !enforceInDev) {
          return true;
        }
        // Production: require a valid session token.
        return !!token;
      },
    },
    pages: {
      signIn: '/auth/signin',
    },
  }
);

// Route matcher: exclude all public/static paths listed above.
// The negative lookahead covers every public path in a single pattern.
export const config = {
  matcher: [
    '/((?!auth|api/auth|api/health|_next/static|_next/image|favicon\\.ico|sounds|icons).*)',
  ],
};
