import { describe, it, expect } from 'vitest';
import { formatStokBola, breakdownStokBola, hitungTotalBiji } from './stock';

describe('formatStokBola', () => {
  it('formats positive stocks correctly into Tabung and Biji', () => {
    expect(formatStokBola(146)).toBe('12 Tabung 2 Biji');
    expect(formatStokBola(123)).toBe('10 Tabung 3 Biji');
    expect(formatStokBola(12)).toBe('1 Tabung 0 Biji');
    expect(formatStokBola(5)).toBe('0 Tabung 5 Biji');
    expect(formatStokBola(0)).toBe('0 Tabung 0 Biji');
  });

  it('handles negative stock gracefully', () => {
    expect(formatStokBola(-5)).toBe('-0 Tabung 5 Biji');
    expect(formatStokBola(-14)).toBe('-1 Tabung 2 Biji');
  });

  it('handles NaN gracefully', () => {
    expect(formatStokBola(NaN)).toBe('0 Tabung 0 Biji');
  });
});

describe('hitungTotalBiji', () => {
  it('calculates total biji from tabung and biji', () => {
    expect(hitungTotalBiji(12, 2)).toBe(146);
    expect(hitungTotalBiji(10, 3)).toBe(123);
    expect(hitungTotalBiji(0, 5)).toBe(5);
    expect(hitungTotalBiji(1, 0)).toBe(12);
  });
});

describe('breakdownStokBola', () => {
  it('returns breakdown object with tabung, biji, and formatted string', () => {
    const res = breakdownStokBola(146);
    expect(res.tabung).toBe(12);
    expect(res.biji).toBe(2);
    expect(res.formatted).toBe('12 Tabung 2 Biji');
  });
});
