// ============================================================
// Next.js Middleware - Provider Portal Route Protection
// apps/provider-portal/middleware.ts
//
// Protects all routes requiring authentication and enforces RBAC
// Clinical shift-aligned 8-hour sessions
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/signout',
  '/auth/error',
  '/auth/callback',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/sounds',
  '/images',
];

// Routes requiring specific roles
const ROLE_ROUTES: Record<string, string[]> = {
  '/settings/admin': ['ADMIN'],
  '/api/admin': ['ADMIN'],
  '/labs': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/imaging': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/medications': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/referrals': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/treatment-plan': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/api/labs': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/api/imaging': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/api/prescriptions': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/api/referrals': ['ADMIN', 'PROVIDER', 'NURSE'],
};

// Provider-only routes (prescribing controlled substances)
const PROVIDER_ONLY_ROUTES = [
  '/api/prescriptions/controlled',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Get JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // No token - redirect to signin
  if (!token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    
    // For API routes, return 401 instead of redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }
    
    return NextResponse.redirect(signInUrl);
  }

  // Check session expiry (8-hour clinical shift)
  const sessionExpiry = token.exp as number;
  if (sessionExpiry && Date.now() / 1000 > sessionExpiry) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Session expired', code: 'SESSION_EXPIRED' },
        { status: 401 }
      );
    }
    
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('error', 'SessionExpired');
    return NextResponse.redirect(signInUrl);
  }

  const userRole = token.role as string;

  // Check provider-only routes
  if (PROVIDER_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
    if (userRole !== 'PROVIDER' && userRole !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Provider privileges required', code: 'PROVIDER_REQUIRED' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Check role-based routes
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { 
              error: 'Insufficient permissions',
              code: 'ROLE_FORBIDDEN',
              requiredRoles: allowedRoles,
              userRole,
            },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
      break;
    }
  }

  // Add user info to headers for API routes
  const response = NextResponse.next();
  if (pathname.startsWith('/api/')) {
    response.headers.set('x-user-id', token.sub || '');
    response.headers.set('x-user-role', userRole);
    response.headers.set('x-user-email', token.email as string || '');
    if (token.providerId) {
      response.headers.set('x-provider-id', token.providerId as string);
    }
  }

  return response;
}

// Configure which routes use middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
