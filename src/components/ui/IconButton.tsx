'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon } from './AppIcon';

type IconButtonVariant = 'ghost' | 'tonal' | 'filled';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const variantMap: Record<IconButtonVariant, string> = {
  ghost: 'bg-transparent text-primary-700 hover:bg-primary-100',
  tonal: 'bg-primary-100 text-primary-700 hover:bg-primary-100/80',
  filled: 'bg-primary-700 text-white hover:bg-primary-900',
};

const sizeMap: Record<IconButtonSize, { box: string; iconSize: 'sm' | 'md' }> = {
  sm: { box: 'w-10 h-10', iconSize: 'sm' },
  md: { box: 'w-11 h-11', iconSize: 'md' },
  lg: { box: 'w-12 h-12', iconSize: 'md' },
};

export function IconButton({
  icon,
  label,
  variant = 'ghost',
  size = 'md',
  className = '',
  disabled,
  ...props
}: IconButtonProps) {
  const { box, iconSize } = sizeMap[size];
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      {...props}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-full transition-all',
        'active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantMap[variant],
        box,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <AppIcon icon={icon} size={iconSize} />
    </button>
  );
}
