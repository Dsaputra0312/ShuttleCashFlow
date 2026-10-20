'use client';

import React from 'react';
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center font-medium transition-all',
    'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-primary-700 text-white hover:bg-primary-900 active:bg-primary-900',
        tonal: 'bg-primary-100 text-primary-700 hover:bg-primary-100/80',
        ghost: 'bg-transparent text-primary-700 hover:bg-primary-100',
        destructive: 'bg-danger text-white hover:opacity-90',
        // Backward-compatible aliases
        secondary: 'bg-primary-100 text-primary-700 hover:bg-primary-100/80',
        // 'danger' kept as alias for 'destructive' for backward compatibility
        danger: 'bg-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3 text-caption rounded-md',
        md: 'h-11 px-4 text-body rounded-lg',
        lg: 'h-[52px] px-6 text-body rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

type ButtonVariant = 'primary' | 'tonal' | 'ghost' | 'destructive' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={buttonVariants({ variant, size, className })}
    >
      {loading ? (
        <span
          className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </button>
  );
}
