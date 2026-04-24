/**
 * Resolves the absolute site URL from environment.
 *
 * Precedence:
 * - NEXT_PUBLIC_SITE_URL: explicit override (set at build time in the Dockerfile
 *   so the value is inlined into static-prerendered pages).
 * - http://localhost:${PORT ?? 3000}: dev fallback (respects `next dev -p`).
 *
 * Intended for Server Component usage (metadata in layouts, API email templates,
 * webhook callbacks). Safe to import from Client Components — NEXT_PUBLIC_ vars
 * are inlined at build time and the localhost fallback is harmless.
 *
 * Docker gotcha: NEXT_PUBLIC_SITE_URL must be set BEFORE `next build` runs, not
 * at container start. Otherwise the value baked into static HTML will be
 * localhost. See apps/web/Dockerfile for the ARG/ENV pattern.
 */
export function getSiteUrl(): URL {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  return new URL(`http://localhost:${process.env.PORT ?? '3000'}`);
}
