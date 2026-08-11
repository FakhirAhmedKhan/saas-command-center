import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@command-center/ui', '@command-center/shared-types'],
};

export default nextConfig;
