// Root not-found boundary. Rendered when `notFound()` is called or a URL
// doesn't match any segment. We ship a deliberately lightweight inline header
// here (no Lenis / GSAP / Three) so the 404 payload stays small — the full
// marketing chrome lives behind (marketing)/layout.tsx, which Next skips for
// app/not-found.tsx.
// Docs: https://nextjs.org/docs/app/api-reference/file-conventions/not-found.
import Link from 'next/link';
import styles from './not-found.module.scss';

export default function NotFound() {
  return (
    <main id="main-content" className={styles.notFound}>
      <header className={styles.notFound__header}>
        <Link
          href="/"
          aria-label="Blue Escrow home"
          className={styles.notFound__brand}
        >
          Blue <em>Escrow</em>
        </Link>
      </header>

      <section className={styles.notFound__body}>
        <div className={styles.notFound__well}>
          <h1>This page isn&apos;t here.</h1>
          <p>
            The funds are still safe in the contract, but this URL isn&apos;t one
            of ours.
          </p>
          <p>
            <Link href="/">Back to the homepage</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
