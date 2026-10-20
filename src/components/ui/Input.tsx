'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
}

export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  rightElement,
  leftElement,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-caption font-medium text-ink-900"
        >
          {label}
        </label>
      )}
      <div className="relative w-full">
        {leftElement && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-ink-400">
            {leftElement}
          </div>
        )}
        <input
          id={inputId}
          {...props}
          className={[
            'h-11 w-full rounded-lg border border-line bg-surface px-3 text-body text-ink-900',
            leftElement ? 'pl-10' : '',
            rightElement ? 'pr-11' : '',
            'placeholder:text-ink-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-danger focus:ring-danger focus:border-danger'
              : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-caption text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-caption text-ink-400">
          {hint}
        </p>
      )}
    </div>
  );
}
