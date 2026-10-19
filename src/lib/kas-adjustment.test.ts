import { describe, it, expect } from 'vitest';
import {
  calculateSetSaldoAdjustment,
  calculateTambahKurangAdjustment,
} from './kas-adjustment';

describe('kas-adjustment', () => {
  describe('calculateSetSaldoAdjustment', () => {
    it('creates pemasukan when target is greater than current saldo', () => {
      const res = calculateSetSaldoAdjustment({
        currentSaldo: 500000,
        targetSaldo: 750000,
      });

      expect(res.tipe).toBe('pemasukan');
      expect(res.nominal).toBe(250000);
      expect(res.diff).toBe(250000);
      expect(res.alasan).toBe('Pencatatan sisa fisik kas');
    });

    it('creates pengeluaran when target is less than current saldo', () => {
      const res = calculateSetSaldoAdjustment({
        currentSaldo: 500000,
        targetSaldo: 350000,
        customAlasan: 'Selisih uang kas hilang saat dihitung fisik',
      });

      expect(res.tipe).toBe('pengeluaran');
      expect(res.nominal).toBe(150000);
      expect(res.diff).toBe(-150000);
      expect(res.alasan).toBe('Selisih uang kas hilang saat dihitung fisik');
    });

    it('throws error when target equals current saldo', () => {
      expect(() =>
        calculateSetSaldoAdjustment({
          currentSaldo: 500000,
          targetSaldo: 500000,
        })
      ).toThrow('Target saldo sama dengan saldo saat ini');
    });
  });

  describe('calculateTambahKurangAdjustment', () => {
    it('handles addition (+)', () => {
      const res = calculateTambahKurangAdjustment({
        currentSaldo: 100000,
        operasi: '+',
        nominal: 50000,
        alasan: 'Donasi bola/kas anggota',
      });

      expect(res.tipe).toBe('pemasukan');
      expect(res.nominal).toBe(50000);
      expect(res.diff).toBe(50000);
      expect(res.newSaldo).toBe(150000);
      expect(res.alasan).toBe('Donasi bola/kas anggota');
    });

    it('handles subtraction (-)', () => {
      const res = calculateTambahKurangAdjustment({
        currentSaldo: 100000,
        operasi: '-',
        nominal: 20000,
        alasan: 'Beli air mineral tak terduga',
      });

      expect(res.tipe).toBe('pengeluaran');
      expect(res.nominal).toBe(20000);
      expect(res.diff).toBe(-20000);
      expect(res.newSaldo).toBe(80000);
      expect(res.alasan).toBe('Beli air mineral tak terduga');
    });

    it('throws if nominal is zero or negative', () => {
      expect(() =>
        calculateTambahKurangAdjustment({
          currentSaldo: 100000,
          operasi: '+',
          nominal: 0,
          alasan: 'Test',
        })
      ).toThrow('Nominal harus lebih dari 0');
    });

    it('throws if alasan is empty', () => {
      expect(() =>
        calculateTambahKurangAdjustment({
          currentSaldo: 100000,
          operasi: '+',
          nominal: 10000,
          alasan: '   ',
        })
      ).toThrow('Alasan penyesuaian kas wajib diisi');
    });
  });
});
