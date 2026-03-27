import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';
import styles from './Button.module.scss';

type ButtonBase = {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
};

type ButtonAsLink = ButtonBase &
  { href: string } & Omit<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    keyof ButtonBase
  >;

type ButtonAsButton = ButtonBase &
  { href?: never } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    keyof ButtonBase
  >;

export type ButtonProps = ButtonAsLink | ButtonAsButton;

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonProps) {
  const classNames = [
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if ('href' in rest && rest.href) {
    const { href, ...anchorProps } = rest as ButtonAsLink;
    return (
      <a href={href} className={classNames} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { disabled, ...buttonProps } = rest as ButtonAsButton;
  return (
    <button
      className={classNames}
      disabled={disabled}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
