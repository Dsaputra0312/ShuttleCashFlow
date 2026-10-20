'use client';

import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({
  label,
  error,
  hint,
  id,
  rows = 4,
  className = '',
  ...props
}: TextareaProps) {
  const textareaId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-caption font-medium text-ink-900"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        {...props}
        className={[
          'w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-body text-ink-900',
          'placeholder:text-ink-400 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-danger focus:ring-danger focus:border-danger' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={
          error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined
        }
      />
      {error && (
        <p id={`${textareaId}-error`} className="text-caption text-danger" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${textareaId}-hint`} className="text-caption text-ink-400">
          {hint}
        </p>
      )}
    </div>
  );
}
