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
    // Next's internal Sass pipeline still relies on the legacy JS API, so we
    // silence only that deprecation. Our own code is fully @use/@forward (no
    // @import usages in apps/web/src), so the 'import' silencer is unneeded.
    silenceDeprecations: ['legacy-js-api'],
  },
  ...(allowedDevOrigins?.length && { allowedDevOrigins }),
};

export default nextConfig;
