'use client';

import React from 'react';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  label,
  disabled = false,
}: StepperProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-caption font-medium text-ink-900">{label}</span>
      )}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          aria-label="Kurang"
          className="flex w-12 h-12 items-center justify-center rounded-l-md border border-r-0 border-line bg-surface text-xl font-bold text-ink-700 hover:bg-peach-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          −
        </button>
        <div
          className="flex h-12 min-w-[56px] items-center justify-center border border-line bg-surface px-3 text-body font-medium text-ink-900 nums"
          aria-label={label ? `${label}: ${value}` : String(value)}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          aria-label="Tambah"
          className="flex w-12 h-12 items-center justify-center rounded-r-md border border-l-0 border-line bg-surface text-xl font-bold text-ink-700 hover:bg-peach-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
