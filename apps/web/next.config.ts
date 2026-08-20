import type { NextConfig } from 'next';

const requiredVercelPublicEnvironmentVariables = ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_TRACKER_SCRIPT_URL', 'NEXT_PUBLIC_INGESTION_URL'] as const;

function validateVercelEnvironment(): void {
  if (process.env.VERCEL !== '1') {
    return;
  }

  for (const key of requiredVercelPublicEnvironmentVariables) {
    const value = process.env[key]?.trim();

    if (!value) {
      throw new Error(`${key} must be configured for Vercel deployments.`);
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error(`${key} must be a valid absolute URL.`);
    }

    if (url.protocol !== 'https:') {
      throw new Error(`${key} must use HTTPS on Vercel.`);
    }

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '::1') {
      throw new Error(`${key} cannot point to localhost on Vercel.`);
    }
  }
}

validateVercelEnvironment();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  transpilePackages: ['@command-center/ui', '@command-center/shared-types'],
};

export default nextConfig;
