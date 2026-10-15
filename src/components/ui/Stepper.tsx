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
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      )}
      <div className="flex items-center gap-0">
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || value <= min}
          aria-label="Kurang"
          className="flex h-11 w-11 items-center justify-center rounded-l-lg border border-r-0 border-neutral-300 bg-neutral-100 text-xl font-bold text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          −
        </button>
        <div
          className="flex h-11 min-w-[64px] items-center justify-center border border-neutral-300 bg-white px-3 text-base font-medium text-neutral-900"
          aria-label={label ? `${label}: ${value}` : String(value)}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={increment}
          disabled={disabled || value >= max}
          aria-label="Tambah"
          className="flex h-11 w-11 items-center justify-center rounded-r-lg border border-l-0 border-neutral-300 bg-neutral-100 text-xl font-bold text-neutral-700 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
