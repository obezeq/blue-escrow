// Sitemap generated from Footer.tsx link inventory. Next 16 serves the XML
// output at /sitemap.xml automatically. URLs are absolute, derived from
// getSiteUrl() so the sitemap follows NEXT_PUBLIC_SITE_URL across environments
// (dev localhost -> staging preview -> prod). lastModified is intentionally a
// fixed date matching the homepage relaunch; we'll bump it when copy/structure
// changes in a content migration.
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap.
import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@blue-escrow/config';

// Fixed "last modified" stamp tied to the v6 relaunch. Prefer a frozen Date
// over new Date() so every build produces an identical sitemap (cache-friendly)
// and so crawlers don't interpret a build-time timestamp drift as fresh content.
const LAST_MODIFIED = new Date('2026-04-22');

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().toString().replace(/\/$/, '');

  const abs = (path: string): string =>
    path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  // Canonical landing — highest priority, changes on every relaunch.
  const homepage: MetadataRoute.Sitemap[number] = {
    url: `${base}/`,
    lastModified: LAST_MODIFIED,
    changeFrequency: 'weekly',
    priority: 1,
  };

  // TODO(seo): the following URLs are enumerated from Footer.tsx but most are
  // not yet implemented as pages. They are included so crawlers start indexing
  // them the moment they ship. Remove this comment after each route lands.
  const productRoutes: MetadataRoute.Sitemap = [
    { url: abs('/docs'), lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.7 },
    { url: abs('/docs/contract'), lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.6 },
    { url: abs('/docs/audits'), lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.6 },
    { url: abs('/docs/reputation'), lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const directoryRoutes: MetadataRoute.Sitemap = [
    { url: abs('/middlemen'), lastModified: LAST_MODIFIED, changeFrequency: 'weekly', priority: 0.8 },
    { url: abs('/middlemen/apply'), lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.6 },
    { url: abs('/middlemen/leaderboard'), lastModified: LAST_MODIFIED, changeFrequency: 'daily', priority: 0.7 },
  ];

  const legalRoutes: MetadataRoute.Sitemap = [
    { url: abs('/terms'), lastModified: LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.3 },
    { url: abs('/privacy'), lastModified: LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.3 },
    { url: abs('/security'), lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.3 },
    { url: abs('/legal'), lastModified: LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.2 },
  ];

  return [homepage, ...productRoutes, ...directoryRoutes, ...legalRoutes];
}
