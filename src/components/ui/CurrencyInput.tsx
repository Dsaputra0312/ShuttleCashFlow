'use client';

import React from 'react';
import { Input } from './Input';
import { Chip } from './Chip';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  quickAdds?: number[];
  className?: string;
}

function parseRibuan(str: string): number {
  const digits = str.replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function formatChipLabel(val: number): string {
  if (val >= 1_000_000) {
    const jt = val / 1_000_000;
    return `+${jt % 1 === 0 ? jt : jt.toFixed(1)}jt`;
  }
  if (val >= 1_000) {
    const rb = val / 1_000;
    return `+${rb % 1 === 0 ? rb : rb.toFixed(0)}rb`;
  }
  return `+${val}`;
}

/**
 * Currency input with live Indonesian Rupiah thousand separator formatting (e.g. 50.000),
 * standard 'Rp' prefix, and optional quick-add preset chips (+10rb, +20rb, +50rb, +100rb).
 */
export function CurrencyInput({
  value,
  onChange,
  label,
  error,
  hint,
  id,
  disabled,
  placeholder = '0',
  quickAdds,
  className = '',
}: CurrencyInputProps) {
  // Format with thousand separator directly
  const displayValue = value && !isNaN(value) ? value.toLocaleString('id-ID') : '';

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseRibuan(e.target.value);
    onChange(raw);
  }

  function handleQuickAdd(amount: number) {
    const current = typeof value === 'number' && !isNaN(value) ? value : 0;
    onChange(current + amount);
  }

  function handleReset() {
    onChange(0);
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Input
        id={id}
        label={label}
        error={error}
        hint={hint}
        disabled={disabled}
        inputMode="numeric"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        leftElement={<span className="font-semibold text-ink-600 text-[12px] select-none">Rp</span>}
        className={['nums font-semibold tracking-wide', className].filter(Boolean).join(' ')}
      />

      {quickAdds && quickAdds.length > 0 && !disabled && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {quickAdds.map((addVal) => (
            <Chip
              key={addVal}
              size="sm"
              label={formatChipLabel(addVal)}
              onClick={() => handleQuickAdd(addVal)}
            />
          ))}
          {value > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="h-7 px-2 text-caption font-semibold rounded-full text-danger hover:bg-danger-surface transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
