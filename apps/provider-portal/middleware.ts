// =============================================================================
// ATTENDING AI - Provider Portal Middleware
// apps/provider-portal/middleware.ts
//
// Protects all provider-facing pages and API routes with NextAuth session
// enforcement in ALL environments (dev bypass removed — Phase 0 hardening).
//
// RESPONSE BY REQUEST TYPE:
//   Page routes  — unauthenticated → 302 redirect to /auth/signin
//   API routes   — unauthenticated → 401 JSON { error: 'Unauthorized' }
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

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Security headers on every response
  const response = token ? NextResponse.next() : undefined;
  if (response) {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws://localhost:* http://localhost:* https://*.azure.com https://*.openai.azure.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ');
    response.headers.set('Content-Security-Policy', csp);
    return response;
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
