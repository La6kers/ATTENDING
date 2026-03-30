/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  output: 'standalone',
  transpilePackages: ['@attending/shared'],
  webpack: (config) => {
    config.resolve.symlinks = true;
    return config;
  },
}

module.exports = nextConfig
