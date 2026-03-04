/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Remove X-Powered-By: Next.js header (security hardening)
  poweredByHeader: false,

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
  // Redirects
  // ============================================================
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // ============================================================
  // API Rewrites & .NET Backend Proxy
  // ============================================================
  async rewrites() {
    const dotnetBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    const dotnetBaseUrl = dotnetBackendUrl.replace(/\/api\/v1$/, '');

    return {
      beforeFiles: [
        // ============================================================
        // .NET Backend Proxy (development)
        // Proxies clinical orders API calls through Next.js to avoid
        // CORS issues during local development. In production, the
        // frontend talks directly to the .NET API behind a reverse
        // proxy (Azure Front Door / API Management).
        // ============================================================
        {
          source: '/dotnet-api/:path*',
          destination: `${dotnetBaseUrl}/api/v1/:path*`,
        },
        // SignalR hub proxy
        {
          source: '/hubs/:path*',
          destination: `${dotnetBaseUrl}/hubs/:path*`,
        },
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
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '0' },
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
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'X-API-Version', value: '1.0.0' },
        ],
      },
      {
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
