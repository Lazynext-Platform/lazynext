'use client';

import { forwardRef } from 'react';
import Link from 'next/link';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

const variantClasses: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

interface ButtonProps extends BaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  href?: undefined;
}

interface LinkButtonProps extends BaseProps {
  href: string;
  prefetch?: boolean;
  onClick?: () => void;
}

type Props = ButtonProps | LinkButtonProps;

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...rest },
  ref,
) {
  const cls = `${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

  if ('href' in rest && rest.href) {
    const { href, prefetch, onClick, ...linkRest } = rest;
    return (
      <Link href={href} prefetch={prefetch} onClick={onClick} className={cls} {...linkRest}>
        {children}
      </Link>
    );
  }

  const { href: _, ...buttonRest } = rest as ButtonProps;
  return (
    <button ref={ref} className={cls} {...buttonRest}>
      {children}
    </button>
  );
});
