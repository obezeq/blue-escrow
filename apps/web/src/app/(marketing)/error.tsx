'use client';

// Marketing-segment error boundary. Next renders this INSIDE the parent
// <main id="main-content"> from (marketing)/layout.tsx — we must NOT render
// another <main> (would cause double-main and skip-link misroute). Copy stays
// sibling to the root boundary but scoped to the marketing surface.
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/error.
import { useEffect } from 'react';

interface MarketingErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function MarketingError({ error, reset }: MarketingErrorProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('be:error', { detail: { digest: error.digest } }),
    );
  }, [error.digest]);

  const digest = error.digest ?? 'no-digest';

  return (
    <section
      role="alert"
      aria-live="assertive"
      style={{
        minHeight: '60dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '36rem', textAlign: 'center' }}>
        <h1>Something broke.</h1>
        <p>
          The page stumbled loading. Funds in the contract are unaffected. Reference:{' '}
          <code>{digest}</code>
        </p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </section>
  );
}
