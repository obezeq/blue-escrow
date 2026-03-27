import { HeroAnimations } from './HeroAnimations';
import { Button } from '@/components/ui';
import styles from './HeroSection.module.scss';

export function HeroSection() {
  return (
    <section className={`o-section o-section--blue ${styles.hero}`} id="hero">
      <div className={`o-container ${styles.hero__container}`}>
        <HeroAnimations>
          <h1 className={styles.hero__title}>Money flows. Trust stays.</h1>
          <p className={styles.hero__subtitle}>
            Your money in a smart contract. Not in someone&apos;s pocket.
          </p>
          <div className={styles.hero__ctas}>
            <Button variant="primary" size="lg" href="/app/deals/new">
              Start a deal
            </Button>
            <Button variant="secondary" size="lg" href="#the-flow">
              See how it works
            </Button>
          </div>
        </HeroAnimations>
      </div>
    </section>
  );
}
