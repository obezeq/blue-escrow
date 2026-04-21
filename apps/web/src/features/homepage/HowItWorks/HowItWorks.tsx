import { HowItWorksAnimations } from './HowItWorksAnimations';
import { PlusIcon, PenIcon, LockIcon, BoxIcon, UnlockIcon } from './icons';
import styles from './HowItWorks.module.scss';

const STEPS = [
  {
    number: '01',
    title: 'Create',
    body: 'Any party creates a deal on-chain. Invite others by wallet or link.',
    Icon: PlusIcon,
  },
  {
    number: '02',
    title: 'Sign',
    body: 'All three parties confirm with their wallet. Terms locked on-chain.',
    Icon: PenIcon,
  },
  {
    number: '03',
    title: 'Deposit',
    body: 'The buyer sends USDC directly to the smart contract.',
    Icon: LockIcon,
  },
  {
    number: '04',
    title: 'Deliver',
    body: 'The seller delivers. Both parties confirm completion.',
    Icon: BoxIcon,
  },
  {
    number: '05',
    title: 'Resolve',
    body: 'Funds released to the seller. NFT receipts minted for all parties.',
    Icon: UnlockIcon,
  },
] as const;

export function HowItWorks() {
  return (
    <section
      className={`o-section ${styles.howItWorks}`}
      id="how-it-works"
      aria-label="How it works in five steps"
    >
      <HowItWorksAnimations>
        <div
          className={`o-container o-container--wide ${styles.howItWorks__container}`}
        >
          <h2 className={styles.howItWorks__heading} data-animate="heading">
            How it works
          </h2>

          <div className={styles.howItWorks__track} data-animate="track">
            <ol className={styles.howItWorks__list} data-animate="list">
              {STEPS.map((step) => (
                <li
                  key={step.number}
                  className={styles.howItWorks__item}
                  data-step={step.number}
                >
                  <div className={styles.howItWorks__card}>
                    <span className={styles.howItWorks__number}>
                      {step.number}
                    </span>
                    <step.Icon className={styles.howItWorks__icon} />
                    <h3 className={styles.howItWorks__title}>{step.title}</h3>
                    <p className={styles.howItWorks__body}>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </HowItWorksAnimations>
    </section>
  );
}
