'use client';

import React, { useState } from 'react';
import { Input } from './Input';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
}

function formatRibuan(n: number): string {
  if (isNaN(n) || n === 0) return '';
  return 'Rp' + n.toLocaleString('id-ID');
}

function parseRibuan(str: string): number {
  const digits = str.replace(/[^\d]/g, '');
  const parsed = parseInt(digits, 10);
  return isNaN(parsed) ? 0 : parsed;
}

export function CurrencyInput({
  value,
  onChange,
  label,
  error,
  hint,
  id,
  disabled,
  placeholder = 'Rp0',
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);

  // While focused: show raw digits; when blurred: show formatted Rupiah
  const displayValue = focused
    ? value === 0
      ? ''
      : String(value)
    : formatRibuan(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseRibuan(e.target.value);
    onChange(raw);
  }

  function handleFocus() {
    setFocused(true);
  }

  function handleBlur() {
    setFocused(false);
  }

  return (
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
      onFocus={handleFocus}
      onBlur={handleBlur}
      className="nums"
    />
  );
}
