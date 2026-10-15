import { describe, it, expect } from 'vitest';
import { roundUpToMultiple, formatRupiah } from './money';

describe('roundUpToMultiple', () => {
  it('rounds 11250 up to 12000 with multiple 1000', () => {
    expect(roundUpToMultiple(11250, 1000)).toBe(12000);
  });

  it('returns 0 when amount is 0', () => {
    expect(roundUpToMultiple(0, 1000)).toBe(0);
  });

  it('keeps an exact multiple unchanged', () => {
    expect(roundUpToMultiple(12000, 1000)).toBe(12000);
    expect(roundUpToMultiple(5000, 500)).toBe(5000);
  });

  it('rounds 1 up to 1000 with multiple 1000', () => {
    expect(roundUpToMultiple(1, 1000)).toBe(1000);
  });

  it('throws on negative multiple', () => {
    expect(() => roundUpToMultiple(10000, -1000)).toThrow();
  });

  it('throws on zero multiple', () => {
    expect(() => roundUpToMultiple(10000, 0)).toThrow();
  });
});

describe('formatRupiah', () => {
  it('formats 12000 correctly', () => {
    expect(formatRupiah(12000)).toBe('Rp 12.000');
  });

  it('formats 1500000 correctly', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000');
  });
});
