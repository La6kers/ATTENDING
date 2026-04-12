// =============================================================================
// ATTENDING AI - COMPASS Admin Middleware
// apps/compass-admin/middleware.ts
//
// Protects all admin pages and API routes with NextAuth session enforcement.
// Pattern matches provider-portal/middleware.ts (Phase 0 hardened).
//
// PUBLIC PATHS (never protected):
//   /auth/*          — sign-in, sign-out, error, callback routes
//   /api/auth/*      — NextAuth API routes
//   /api/health      — health check for uptime monitoring
//   /_next/*         — Next.js static assets
//   /favicon.ico     — browser favicon
// =============================================================================

import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (token) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // API routes — return 401 JSON
  if (pathname.startsWith('/api/')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Page routes — redirect to sign-in
  const signInUrl = req.nextUrl.clone();
  signInUrl.pathname = '/auth/signin';
  signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    '/((?!auth|api/auth|api/health|_next/static|_next/image|favicon\\.ico).*)',
  ],
};
