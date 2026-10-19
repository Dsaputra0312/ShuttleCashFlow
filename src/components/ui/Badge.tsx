import React from 'react';
import { cva } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium',
  {
    variants: {
      variant: {
        // Domain variants
        member: 'bg-tint-mint text-icon-mint',
        'non-member': 'bg-peach-100 text-ink-600',
        'bebas-biaya': 'bg-primary-100 text-primary-700',
        bermain: 'bg-peach-100 text-icon-orange',
        selesai: 'bg-warning-tonal text-warning',
        lunas: 'bg-tint-mint text-icon-mint',
        'belum-lunas': 'bg-danger-tonal text-danger',
        terkunci: 'bg-peach-100 text-ink-600',
        aktif: 'bg-tint-mint text-icon-mint',
        'non-aktif': 'bg-peach-100 text-ink-400',
        // Generic / backward-compatible variants
        default: 'bg-peach-100 text-ink-600',
        success: 'bg-tint-mint text-icon-mint',
        danger: 'bg-danger-tonal text-danger',
        warning: 'bg-warning-tonal text-warning',
        info: 'bg-primary-100 text-primary-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type BadgeVariant =
  | 'member'
  | 'non-member'
  | 'bebas-biaya'
  | 'bermain'
  | 'selesai'
  | 'lunas'
  | 'belum-lunas'
  | 'terkunci'
  | 'aktif'
  | 'non-aktif'
  | 'default'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ label, variant = 'default', className }: BadgeProps) {
  return (
    <span className={badgeVariants({ variant, className })}>
      {label}
    </span>
  );
}
