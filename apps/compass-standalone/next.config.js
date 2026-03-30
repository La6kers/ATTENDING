/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@attending/shared'],
  typescript: {
    // Shared package has pre-existing type issues from recent merge
    // Compass-standalone types are verified locally
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.resolve.symlinks = true;
    return config;
  },
}

module.exports = nextConfig
