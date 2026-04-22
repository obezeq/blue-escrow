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
  experimental: {
    // Tree-shake barrel files from animation + 3D dependencies. Next rewrites
    // `import { X } from 'pkg'` → direct submodule imports at build time, so
    // only the members we actually use ship in the client bundle. Biggest win
    // is `@react-three/drei` (~150-200KB uncompressed). `gsap-register.ts`
    // still evaluates `gsap.registerPlugin(...)` side effects because that
    // module is imported for its side effects, not treeshaken by name.
    // Verified via build + hero render smoke.
    optimizePackageImports: [
      'gsap',
      '@gsap/react',
      'lenis',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
    ],
  },
  ...(allowedDevOrigins?.length && { allowedDevOrigins }),
};

export default nextConfig;
