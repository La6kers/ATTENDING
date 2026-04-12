/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Allow builds with TS/ESLint errors (demo environment)
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Remove X-Powered-By: Next.js header (security hardening)
  poweredByHeader: false,
  // Do not expose source maps to the browser in production (security hardening)
  productionBrowserSourceMaps: false,

  // Standalone output for Docker deployments (copies only needed node_modules)
  output: 'standalone',
  
  // Transpile the shared workspace package
  transpilePackages: ['@attending/shared', '@attending/ui-primitives'],
  
  // Configure webpack for workspace resolution
  webpack: (config, { isServer }) => {
    const path = require('path');
    const webpack = require('webpack');
    // Handle workspace package resolution
    config.resolve.symlinks = true;

    // Stub out @attending/clinical-services (not yet a real workspace package)
    config.resolve.alias = {
      ...config.resolve.alias,
      '@attending/clinical-services': path.resolve(__dirname, 'lib/stubs/clinical-services.ts'),
    };

    // Redirect broken @/shared/* imports to a catch-all stub.
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /^@\/shared\//,
        path.resolve(__dirname, 'lib/stubs/shared-catch-all.ts')
      )
    );

    // In Docker/CI builds, demote "Module not found" to warnings so the build
    // can complete even when some planned packages aren't implemented yet.
    if (process.env.IGNORE_MISSING_MODULES === '1') {
      const IgnoreMissingModulesPlugin = require('./lib/stubs/ignore-missing-modules');
      config.plugins.push(new IgnoreMissingModulesPlugin());
    }

    // Mark ioredis as external — it's dynamically imported in shared/lib/redis
    // and falls back to mock when unavailable, but webpack still resolves it.
    if (isServer) {
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('ioredis');
      }
    }

    // Node.js built-ins aren't available in browser bundles.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: false,
        ioredis: false,
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

  // Monorepo: trace from repo root so standalone includes node_modules
  outputFileTracingRoot: require('path').join(__dirname, '../../'),

  experimental: {
    instrumentationHook: true,
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
