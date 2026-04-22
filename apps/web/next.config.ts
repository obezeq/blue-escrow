import path from 'node:path';
import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

// `@next/bundle-analyzer` becomes a no-op unless `ANALYZE=true`. We gate it on
// the env var so the plugin is only loaded during explicit analysis runs
// (`pnpm --filter @blue-escrow/web analyze`), keeping normal dev/build free of
// webpack-bundle-analyzer overhead. Outputs land in `.next/analyze/*.html`.
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

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
  async headers() {
    // Baseline security headers applied to every response. CSP stays in
    // `next.config.ts` (static per-env) instead of middleware so we don't pay
    // the request-time cost for a policy that does not vary per user. The
    // `'unsafe-inline'` allowance for script-src covers four intentional
    // inline scripts defined in `src/app/layout.tsx`:
    //   1. ThemeInitScript (theme-bootstrap, avoids FOUC)
    //   2. JsLoadedScript (adds .js-loaded for progressive-enhancement CSS)
    //   3. SpeculationRules (static JSON payload)
    //   4. JSON-LD payloads injected by (marketing)/page.tsx
    // Plus next/font's inline critical CSS. Follow-up (separate subissue)
    // is to migrate to per-request nonces via middleware + strict-dynamic.
    // 'unsafe-eval' is retained while React DevTools + Next's dev overlay
    // rely on it; production builds could drop it if verified clean.
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel-insights.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.arbitrum.io wss://*.arbitrum.io",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value:
              'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          { key: 'Content-Security-Policy', value: cspDirectives.join('; ') },
        ],
      },
    ];
  },
  ...(allowedDevOrigins?.length && { allowedDevOrigins }),
};

export default withBundleAnalyzer(nextConfig);
