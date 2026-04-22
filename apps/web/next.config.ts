import path from 'node:path';
import type { NextConfig } from 'next';

const allowedDevOrigins = process.env.NEXT_DEV_ALLOWED_ORIGINS
  ?.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@blue-escrow/types',
    '@blue-escrow/config',
    '@blue-escrow/contract-abis',
  ],
  sassOptions: {
    silenceDeprecations: ['legacy-js-api', 'import'],
  },
  ...(allowedDevOrigins?.length && { allowedDevOrigins }),
};

export default nextConfig;
