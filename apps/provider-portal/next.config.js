/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Standalone output for Docker deployments (copies only needed node_modules)
  output: 'standalone',
  
  // Transpile the shared workspace package
  transpilePackages: ['@attending/shared'],
  
  // Configure webpack for workspace resolution
  webpack: (config, { isServer }) => {
    // Handle workspace package resolution
    config.resolve.symlinks = true;

    // Node.js built-ins aren't available in browser bundles.
    // events.ts imports 'crypto' for webhook HMAC signing (server-only)
    // but webpack still tries to resolve it for the client build.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
      };
    }

    return config;
  },

  // ============================================================
  // API Versioning
  // /api/v1/* rewrites to /api/* for backward-compatible versioning.
  // When v2 routes are needed, create pages/api/v2/ directory.
  // Unversioned /api/* continues to work during migration.
  // ============================================================
  async rewrites() {
    return {
      beforeFiles: [
        // /api/v1/patients → /api/patients (and all sub-paths)
        {
          source: '/api/v1/:path*',
          destination: '/api/:path*',
        },
      ],
    };
  },

  // ============================================================
  // Security Headers
  // Applied to all routes as static headers. Nonce-based CSP is
  // generated per-request by middleware.ts (section 5 & 6).
  // ============================================================
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Base headers applied to all routes
    // NOTE: CSP is set by middleware.ts (per-request nonce). These are
    // additional headers that don't require dynamic values.
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '0' }, // Disabled; CSP replaces it
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), payment=()' },
    ];

    if (isProduction) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains; preload',
      });
    }

    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // API routes: no-cache for PHI protection + version header
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'X-API-Version', value: '1.0.0' },
        ],
      },
      {
        // Versioned API routes get the same headers
        source: '/api/v1/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'X-API-Version', value: '1.0.0' },
        ],
      },
    ];
  },

  // Enable instrumentation hook for startup validation
  experimental: {
    instrumentationHook: true,
  },
}

module.exports = nextConfig
