// =============================================================================
// ATTENDING AI - Provider Portal Middleware
// apps/provider-portal/middleware.ts
//
// Protects all provider-facing pages and API routes with NextAuth session
// enforcement.
//
// BEHAVIOR BY ENVIRONMENT:
//   development  — skips auth check unless NEXTAUTH_ENFORCE=true is set.
//                  This keeps the local dev loop intact when Azure AD B2C
//                  credentials aren't configured yet.
//   production   — always requires a valid NextAuth session token.
//
// RESPONSE BY REQUEST TYPE:
//   Page routes  — unauthenticated → 302 redirect to /auth/signin
//   API routes   — unauthenticated → 401 JSON { error: 'Unauthorized' }
//                  (avoids redirect loops in fetch/XHR callers)
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

import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const isDevelopment = process.env.NODE_ENV === 'development';
const enforceInDev = process.env.NEXTAUTH_ENFORCE === 'true';

export async function middleware(req: NextRequest) {
  // In development without explicit enforcement, allow all requests.
  if (isDevelopment && !enforceInDev) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token) {
    // Authenticated — proceed.
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // API routes — return 401 JSON so XHR/fetch callers get a proper status code.
  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Page routes — redirect to sign-in.
  const signInUrl = req.nextUrl.clone();
  signInUrl.pathname = '/auth/signin';
  signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

// Route matcher: exclude all public/static paths.
export const config = {
  matcher: [
    '/((?!auth|api/auth|api/health|_next/static|_next/image|favicon\\.ico|sounds|icons).*)',
  ],
};
