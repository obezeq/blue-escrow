import styles from './SkipLink.module.scss';

interface SkipLinkProps {
  targetId?: string;
}

export function SkipLink({ targetId = 'main-content' }: SkipLinkProps) {
  return (
    <a href={`#${targetId}`} className={styles.skip}>
      Skip to main content
    </a>
  );
}
