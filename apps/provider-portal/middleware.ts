// ============================================================
// Next.js Middleware - Provider Portal Route Protection
// apps/provider-portal/middleware.ts
//
// HIPAA-Compliant Route Protection:
// - Authentication verification via JWT
// - Role-based access control (RBAC)
// - Clinical shift-aligned 8-hour sessions
// - NO PII in HTTP headers (security requirement)
// - Audit logging integration
//
// HIPAA Requirements Addressed:
// - 164.312(a)(1) - Access control
// - 164.312(d) - Person/entity authentication
// - 164.308(a)(4) - Information access management
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken, JWT } from 'next-auth/jwt';

// ============================================================
// ROUTE CONFIGURATION
// ============================================================

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/auth/signin',
  '/auth/signout',
  '/auth/error',
  '/auth/callback',
  '/api/auth',
  '/api/health',
  '/api/csrf-token', // CSRF token endpoint
  '/_next',
  '/favicon.ico',
  '/sounds',
  '/images',
  '/manifest.json',
  '/robots.txt',
];

// Routes requiring specific roles - using hierarchical access
const ROLE_ROUTES: Record<string, string[]> = {
  // Admin-only routes
  '/settings/admin': ['ADMIN'],
  '/api/admin': ['ADMIN'],
  '/api/users/manage': ['ADMIN'],
  '/api/audit/query': ['ADMIN'],
  
  // Clinical staff routes (provider, nurse, admin)
  '/labs': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/imaging': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/medications': ['ADMIN', 'PROVIDER'],
  '/referrals': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/treatment-plan': ['ADMIN', 'PROVIDER'],
  '/assessments': ['ADMIN', 'PROVIDER', 'NURSE'],
  
  // API routes with role restrictions
  '/api/labs': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/api/imaging': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/api/prescriptions': ['ADMIN', 'PROVIDER'],
  '/api/referrals': ['ADMIN', 'PROVIDER', 'NURSE'],
  '/api/treatment-plans': ['ADMIN', 'PROVIDER'],
  '/api/clinical': ['ADMIN', 'PROVIDER', 'NURSE'],
};

// Provider-only routes (prescribing controlled substances, signing orders)
const PROVIDER_ONLY_ROUTES = [
  '/api/prescriptions/controlled',
  '/api/prescriptions/sign',
  '/api/orders/sign',
  '/api/clinical/sign-note',
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if path matches any of the given routes
 */
function matchesRoutes(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname.startsWith(route);
  });
}

/**
 * Get roles allowed for a specific path
 */
function getAllowedRoles(pathname: string): string[] | null {
  for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      return roles;
    }
  }
  return null; // No role restriction
}

/**
 * Create a secure session identifier for internal use
 * This is a hash, not the actual session data
 */
function createSecureSessionId(token: JWT): string {
  // Use a combination of token properties to create a session reference
  // This is used for internal tracking, not authentication
  const data = `${token.sub || ''}-${token.iat || ''}-${Date.now()}`;
  
  // Simple hash for reference (not cryptographic - just for correlation)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Build API error response
 */
function apiError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...details,
      },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

// ============================================================
// MIDDLEWARE
// ============================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --------------------------------------------------------
  // 1. SKIP PUBLIC ROUTES
  // --------------------------------------------------------
  if (matchesRoutes(pathname, PUBLIC_ROUTES)) {
    return NextResponse.next();
  }

  // --------------------------------------------------------
  // 2. GET AND VALIDATE JWT TOKEN
  // --------------------------------------------------------
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // No token - redirect to signin or return 401
  if (!token) {
    // Log unauthorized access attempt (audit purposes)
    console.warn('[SECURITY] Unauthenticated access attempt:', {
      path: pathname,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
          request.headers.get('x-real-ip') ||
          'unknown',
      timestamp: new Date().toISOString(),
    });

    if (pathname.startsWith('/api/')) {
      return apiError('AUTH_REQUIRED', 'Authentication required', 401);
    }
    
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // --------------------------------------------------------
  // 3. CHECK SESSION EXPIRY (8-hour clinical shift)
  // --------------------------------------------------------
  const sessionExpiry = token.exp as number;
  const now = Math.floor(Date.now() / 1000);
  
  if (sessionExpiry && now > sessionExpiry) {
    console.info('[AUTH] Session expired:', {
      userId: token.sub,
      expiredAt: new Date(sessionExpiry * 1000).toISOString(),
      path: pathname,
    });

    if (pathname.startsWith('/api/')) {
      return apiError('SESSION_EXPIRED', 'Session has expired. Please sign in again.', 401);
    }
    
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('error', 'SessionExpired');
    return NextResponse.redirect(signInUrl);
  }

  // --------------------------------------------------------
  // 4. ROLE-BASED ACCESS CONTROL
  // --------------------------------------------------------
  const userRole = token.role as string || 'STAFF';

  // Check provider-only routes
  if (matchesRoutes(pathname, PROVIDER_ONLY_ROUTES)) {
    if (userRole !== 'PROVIDER' && userRole !== 'ADMIN') {
      console.warn('[SECURITY] Provider-only route access denied:', {
        userId: token.sub,
        userRole,
        path: pathname,
        timestamp: new Date().toISOString(),
      });

      if (pathname.startsWith('/api/')) {
        return apiError(
          'PROVIDER_REQUIRED',
          'This action requires provider privileges',
          403,
          { requiredRole: 'PROVIDER' }
        );
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Check role-based routes
  const allowedRoles = getAllowedRoles(pathname);
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    console.warn('[SECURITY] Role-based access denied:', {
      userId: token.sub,
      userRole,
      path: pathname,
      requiredRoles: allowedRoles,
      timestamp: new Date().toISOString(),
    });

    if (pathname.startsWith('/api/')) {
      return apiError(
        'ROLE_FORBIDDEN',
        'Insufficient permissions for this resource',
        403,
        { requiredRoles: allowedRoles, userRole }
      );
    }
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // --------------------------------------------------------
  // 5. CREATE SECURE RESPONSE
  // --------------------------------------------------------
  const response = NextResponse.next();

  // --------------------------------------------------------
  // SECURITY: Do NOT put PII in HTTP headers
  // Instead, use encrypted cookies or server-side session lookup
  // 
  // Previous INSECURE approach (removed):
  // response.headers.set('x-user-id', token.sub || '');
  // response.headers.set('x-user-email', token.email || '');
  // 
  // These headers can leak via:
  // - CDN/proxy logs
  // - Browser developer tools
  // - Error tracking services
  // - Third-party scripts
  // --------------------------------------------------------

  // For API routes, set minimal internal headers
  // These are non-PII references for request correlation
  if (pathname.startsWith('/api/')) {
    // Session reference (not the actual user ID or email)
    const sessionRef = createSecureSessionId(token);
    response.headers.set('x-session-ref', sessionRef);
    
    // Role for authorization (not PII)
    response.headers.set('x-user-role', userRole);
    
    // Request ID for tracing
    const requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    response.headers.set('x-request-id', requestId);
  }

  // Set security headers for all responses
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Prevent caching of authenticated content
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');

  return response;
}

// ============================================================
// MATCHER CONFIGURATION
// ============================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
