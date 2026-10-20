'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { AppIcon } from './AppIcon';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  'aria-label'?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Cari...',
  id,
  'aria-label': ariaLabel = 'Cari',
  disabled,
  className = '',
}: SearchFieldProps) {
  return (
    <div className={['relative w-full', className].filter(Boolean).join(' ')}>
      {/* Search icon on the left */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-ink-400">
        <AppIcon icon={Search} size="sm" />
      </div>
      <input
        id={id}
        type="search"
        role="searchbox"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={[
          'h-11 w-full rounded-lg border border-line bg-surface pl-10 text-body text-ink-900',
          value ? 'pr-11' : 'pr-3',
          'placeholder:text-ink-400',
          'focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Hide native clear button (search input)
          '[&::-webkit-search-cancel-button]:appearance-none',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {/* Clear button — shown only when there is a value */}
      {value ? (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-400 hover:text-ink-900 focus:outline-none"
        >
          <AppIcon icon={X} size="sm" />
        </button>
      ) : null}
    </div>
  );
}
