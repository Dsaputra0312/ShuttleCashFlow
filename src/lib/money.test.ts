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

describe('roundUpToMultiple - rounding & boundary (FEAT-006)', () => {
  it('rounds a non-round ball price 4750 up to 5000', () => {
    expect(roundUpToMultiple(4750, 1000)).toBe(5000);
  });

  it('rounds 1 up to the multiple (lower bound)', () => {
    expect(roundUpToMultiple(1, 500)).toBe(500);
  });

  it('rounds just-below a multiple up to the multiple', () => {
    expect(roundUpToMultiple(499, 500)).toBe(500);
  });

  it('keeps an exact multiple unchanged (boundary)', () => {
    expect(roundUpToMultiple(500, 500)).toBe(500);
    expect(roundUpToMultiple(1000, 500)).toBe(1000);
  });

  it('rounds just-above a multiple up to the next multiple', () => {
    expect(roundUpToMultiple(501, 500)).toBe(1000);
    expect(roundUpToMultiple(1001, 1000)).toBe(2000);
  });

  it('handles large fractional splits (6-player share 833)', () => {
    // 5000 bola / 6 players = 833.33 → floor 833, + 10000 lapangan = 10833 → 11000
    expect(roundUpToMultiple(10833, 1000)).toBe(11000);
  });
});

describe('formatRupiah - boundary (FEAT-006)', () => {
  it('formats 0 correctly', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('formats a non-round amount 4750 correctly', () => {
    expect(formatRupiah(4750)).toBe('Rp 4.750');
  });

  it('formats 1 correctly', () => {
    expect(formatRupiah(1)).toBe('Rp 1');
  });
});
