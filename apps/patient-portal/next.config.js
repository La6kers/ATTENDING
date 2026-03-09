/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Remove X-Powered-By: Next.js header (security hardening)
  poweredByHeader: false,

  // Standalone output for Docker deployments
  output: 'standalone',

  // Transpile the shared workspace package
  transpilePackages: ['@attending/shared', 'react-leaflet', '@react-leaflet/core'],

  // Configure webpack for workspace resolution
  webpack: (config, { isServer }) => {
    // Handle workspace package resolution
    config.resolve.symlinks = true;
    return config;
  },

  // ============================================================
  // Security Headers
  // Applied to all routes as static headers.
  // ============================================================
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    // Base headers applied to all routes
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      {
        key: 'Content-Security-Policy',
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'",
      },
    ];

    if (isProduction) {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
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
        ],
      },
    ];
  },
}

module.exports = nextConfig
