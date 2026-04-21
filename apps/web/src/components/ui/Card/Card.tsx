import type { ReactNode, CSSProperties } from 'react';
import styles from './Card.module.scss';

interface CardProps {
  children: ReactNode;
  className?: string;
  accentColor?: string;
  as?: 'div' | 'article';
}

export function Card({
  children,
  className,
  accentColor,
  as: Tag = 'div',
}: CardProps) {
  const classNames = [styles.card, className].filter(Boolean).join(' ');

  const style: CSSProperties | undefined = accentColor
    ? ({ '--card-accent': accentColor } as CSSProperties)
    : undefined;

  return (
    <Tag className={classNames} style={style}>
      {children}
    </Tag>
  );
}
