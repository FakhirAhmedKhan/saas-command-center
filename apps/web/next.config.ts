import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  transpilePackages: ['@command-center/ui', '@command-center/shared-types'],
};

export default nextConfig;
