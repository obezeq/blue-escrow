import type { ReactNode } from 'react';
import styles from './SectionHeading.module.scss';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

interface SectionHeadingProps {
  as?: HeadingLevel;
  children: ReactNode;
  className?: string;
}

export function SectionHeading({
  as: Tag = 'h2',
  children,
  className,
}: SectionHeadingProps) {
  const classNames = [styles.heading, styles[`heading--${Tag}`], className]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classNames}>{children}</Tag>;
}
