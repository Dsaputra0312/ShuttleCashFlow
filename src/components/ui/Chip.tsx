'use client';

import React from 'react';
import { cva } from 'class-variance-authority';

const chipVariants = cva(
  [
    'inline-flex items-center rounded-full font-medium transition-colors shrink-0',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-40',
  ].join(' '),
  {
    variants: {
      selected: {
        true: 'bg-primary-700 text-white',
        false: 'bg-peach-100 text-ink-600 border border-line hover:bg-peach-200',
      },
      size: {
        sm: 'h-7 px-2.5 text-caption gap-1',
        md: 'h-9 px-4 text-body',
      },
    },
    defaultVariants: {
      selected: false,
      size: 'md',
    },
  }
);

interface ChipProps {
  label: React.ReactNode;
  selected?: boolean;
  onSelect?: () => void;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function Chip({
  label,
  selected = false,
  onSelect,
  onClick,
  disabled = false,
  className = '',
  size = 'md',
}: ChipProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.();
    onSelect?.();
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      onClick={handleClick}
      className={chipVariants({ selected, size, className })}
    >
      {label}
    </button>
  );
}
