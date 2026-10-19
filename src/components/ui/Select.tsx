'use client';

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function Select({
  label,
  error,
  hint,
  id,
  className = '',
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-caption font-medium text-ink-900"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        {...props}
        className={[
          'h-11 w-full rounded-lg border border-line bg-surface px-3 text-body text-ink-900',
          'focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'appearance-none',
          error ? 'border-danger focus:ring-danger focus:border-danger' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined
        }
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-caption text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${selectId}-hint`} className="text-caption text-ink-400">
          {hint}
        </p>
      )}
    </div>
  );
}
