// =============================================================================
// API Deprecation Middleware
// apps/provider-portal/middleware.ts
//
// Adds Deprecation and Sunset headers to Next.js API routes that have been
// migrated to the .NET backend. Frontend consumers should migrate to the
// NEXT_PUBLIC_API_URL endpoints.
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that have .NET equivalents â€” add Deprecation header
const DEPRECATED_ROUTES: Record<string, string> = {
  '/api/labs': 'GET /api/v1/laborders â€” see docs/NEXTJS_API_MIGRATION.md',
  '/api/imaging': 'GET /api/v1/imagingorders â€” see docs/NEXTJS_API_MIGRATION.md',
  '/api/prescriptions': 'GET /api/v1/medications â€” see docs/NEXTJS_API_MIGRATION.md',
  '/api/referrals': 'GET /api/v1/referrals â€” see docs/NEXTJS_API_MIGRATION.md',
  '/api/assessments': 'GET /api/v1/assessments â€” see docs/NEXTJS_API_MIGRATION.md',
  '/api/clinical/drug-check': 'POST /api/v1/medications/patient/{id}/check-interactions',
  '/api/clinical/red-flags': 'GET /api/v1/assessments/red-flags',
};

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check if this route is deprecated
  for (const [route, replacement] of Object.entries(DEPRECATED_ROUTES)) {
    if (path.startsWith(route)) {
      const response = NextResponse.next();
      response.headers.set('Deprecation', 'true');
      response.headers.set('Sunset', '2026-06-01');
      response.headers.set('X-Deprecated-Use', replacement);
      response.headers.set(
        'Link',
        `<${process.env.NEXT_PUBLIC_API_URL || 'https://api.attendingai.com'}${replacement.split(' ')[1] || ''}>; rel="successor-version"`
      );
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
