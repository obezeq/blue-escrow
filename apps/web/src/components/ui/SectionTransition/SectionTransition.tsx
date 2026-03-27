import styles from './SectionTransition.module.scss';

type SectionColor = 'blue' | 'white';

interface SectionTransitionProps {
  from: SectionColor;
  to: SectionColor;
  height?: number;
  className?: string;
}

export function SectionTransition({
  from,
  to,
  height = 200,
  className,
}: SectionTransitionProps) {
  const classNames = [
    styles.transition,
    styles[`transition--${from}-to-${to}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      style={{ height }}
      aria-hidden="true"
    />
  );
}
