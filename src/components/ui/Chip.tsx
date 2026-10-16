'use client';

import React from 'react';

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
  const sizeClasses =
    size === 'sm'
      ? 'h-7 px-2.5 text-xs gap-1'
      : 'h-9 px-4 text-sm';

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
      className={[
        'inline-flex items-center rounded-full font-medium transition-colors shrink-0',
        sizeClasses,
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-40',
        selected
          ? 'bg-primary-600 text-white shadow-xs'
          : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 border border-neutral-200/50',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </button>
  );
}
