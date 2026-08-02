import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@command-center/ui', '@command-center/shared-types'],
};

export default nextConfig;
