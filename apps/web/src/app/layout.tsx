import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import { getSiteUrl } from '@blue-escrow/config';
import { ThemeProvider } from '@/providers/ThemeProvider';
import {
  DEFAULT_THEME,
  THEME_COOKIE_NAME,
  THEME_INIT_SCRIPT,
  parseThemeCookie,
} from '@/providers/theme-bootstrap';
import '@/styles/globals.scss';

/**
 * Inline script that adds `js-loaded` to <html> synchronously.
 * Enables CSS progressive enhancement: elements hidden for JS animation
 * become visible for no-JS users via `html:not(.js-loaded) .el { opacity: 1 }`.
 * Content is a hardcoded static string — no user input, no XSS vector.
 */
function JsLoadedScript() {
  return <script>{`document.documentElement.classList.add("js-loaded")`}</script>;
}

/**
 * Pre-hydration theme bootstrap — reads localStorage + prefers-color-scheme
 * and writes html[data-theme] before the first CSS paint, eliminating theme
 * flash. The script body is a hardcoded literal imported from
 * theme-bootstrap.ts — no user input, no XSS vector.
 */
function ThemeInitScript() {
  return <script>{THEME_INIT_SCRIPT}</script>;
}

/**
 * Speculation Rules — instructs supporting browsers (Chrome/Edge 121+) to
 * prerender `/app` on moderate intent (hover/pointerdown on a matching link)
 * and prefetch `/middlemen` + `/docs` conservatively. This shortens the
 * navigation-to-paint budget for the primary CTA without harming initial
 * load. Gated to production to avoid surprise prerenders during local dev.
 *
 * The JSON payload is a static literal — no user input, no XSS vector.
 * Non-supporting browsers ignore the script type entirely.
 *
 * URLs verified against apps/web/src/components/layout/Footer/Footer.tsx.
 */
function SpeculationRules() {
  if (process.env.NODE_ENV !== 'production') return null;
  const rules = {
    prerender: [{ urls: ['/app'], eagerness: 'moderate' }],
    prefetch: [{ urls: ['/middlemen', '/docs'], eagerness: 'conservative' }],
  };
  return <script type="speculationrules">{JSON.stringify(rules)}</script>;
}

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: 'Blue Escrow',
  description:
    'A decentralized escrow protocol where funds are protected by the blockchain, not promises.',
};

// Next.js 16 viewport config. colorScheme tells the browser both themes are
// supported (lets native UI adapt); themeColor matches the active page
// background per color-scheme preference, so the mobile browser chrome
// (Android address bar, iOS standalone status bar) blends into the page.
// Hex values mirror --bg-page in styles/settings/_variables.scss.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Chrome 108+ / Firefox 132+ shrink the layout viewport when the virtual
  // keyboard appears so form fields stay visible without manual scroll.
  // Safari still ignores this (falls back to default visual-viewport
  // behavior); zero-risk addition for the supported browsers.
  interactiveWidget: 'resizes-content',
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0b1117' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookie-driven SSR theming: the server reads `be-theme` and renders the
  // matching `data-theme` + threads it to ThemeProvider, so the initial HTML
  // byte-matches the client's first render. Eliminates the ThemeToggle
  // hydration mismatch for every returning visitor. `suppressHydrationWarning`
  // stays on <html> to cover the first-visit edge (script resolves from
  // `prefers-color-scheme` and rewrites `data-theme` before React hydrates)
  // and the `js-loaded` class added synchronously by JsLoadedScript.
  const jar = await cookies();
  const initialTheme =
    parseThemeCookie(jar.get(THEME_COOKIE_NAME)?.value) ?? DEFAULT_THEME;

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeInitScript />
        <JsLoadedScript />
        <SpeculationRules />
      </head>
      <body>
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
