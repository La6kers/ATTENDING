/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Transpile the shared workspace package
  transpilePackages: ['@attending/shared'],
  
  // Configure webpack for workspace resolution
  webpack: (config, { isServer }) => {
    // Handle workspace package resolution
    config.resolve.symlinks = true;
    return config;
  },
}

module.exports = nextConfig
