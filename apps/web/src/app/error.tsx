'use client';

// Root error boundary. App-Router-mandated signature ({ error, reset }) — Next
// injects this into <body> when a descendant throws above the (marketing) /
// (app) segment error boundaries. We render our own <main id="main-content">
// here because this boundary replaces the entire route tree (no parent layout
// provides one). The telemetry CustomEvent is the hook platform instrumentation
// listens for: deployment-agnostic (no SDK), digest-only (no PII).
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/error.
import { useEffect } from 'react';

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('be:error', { detail: { digest: error.digest } }),
    );
  }, [error.digest]);

  const digest = error.digest ?? 'no-digest';

  return (
    <main
      id="main-content"
      role="alert"
      aria-live="assertive"
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '36rem', textAlign: 'center' }}>
        <h1>Something broke.</h1>
        <p>
          The funds are still safe in the contract — this screen isn&apos;t. Reference:{' '}
          <code>{digest}</code>
        </p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
