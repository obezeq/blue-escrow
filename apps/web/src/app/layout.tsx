import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
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
  title: 'Blue Escrow',
  description:
    'A decentralized escrow protocol where funds are protected by the blockchain, not promises.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <JsLoadedScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
