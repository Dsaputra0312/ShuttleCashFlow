import { describe, it, expect } from 'vitest';
import { hitungTagihan } from './calculator';
import type { SesiInput, PemainInput, KonfigurasiInput } from './types';

/**
 * FEAT-006 T5.2 — rounding & boundary tests for the billing calculator.
 * Covers non-round harga_bola, sessions with balls, and court cost.
 */

const CONFIG: KonfigurasiInput = {
  harga_bola_per_biji: 5000,
  biaya_lapangan_non_member: 10000,
  kelipatan_pembulatan: 1000,
};

const nonMember = (id: string): PemainInput => ({
  id,
  bebas_biaya: false,
  is_member: false,
});

describe('hitungTagihan - rounding & boundary (FEAT-006)', () => {
  // (a) non-round harga_bola (e.g. 4750 per biji)
  it('handles non-round harga_bola 4750 and rounds the total up', () => {
    const pemain: PemainInput[] = [nonMember('A'), nonMember('B')];
    const sesi: SesiInput[] = [
      {
        id: 's1',
        lapangan: 1,
        bola_terpakai: 2, // 2 * 4750 = 9500 each
        ditanggung_oleh_pemain_id: null,
        pemain_ids: ['A', 'B'],
      },
    ];
    const cfg: KonfigurasiInput = {
      harga_bola_per_biji: 4750,
      biaya_lapangan_non_member: 10000,
      kelipatan_pembulatan: 1000,
    };
    const result = hitungTagihan(sesi, pemain, cfg);
    const tA = result.tagihan_per_pemain.find((t) => t.pemain_id === 'A')!;

    // 9500 bola each + 10000 lapangan = 19500 → round up 20000
    expect(tA.biaya_bola_raw).toBe(9500);
    expect(tA.biaya_lapangan_raw).toBe(10000);
    expect(tA.tagihan).toBe(20000);
    expect(result.total_bola_terpakai).toBe(2);
  });

  // (b) 2-player session with 1 ball
  it('2-player session with 1 ball charges 5000 each and adds court cost', () => {
    const pemain: PemainInput[] = [nonMember('A'), nonMember('B')];
    const sesi: SesiInput[] = [
      {
        id: 's1',
        lapangan: 1,
        bola_terpakai: 1, // 5000 each
        ditanggung_oleh_pemain_id: null,
        pemain_ids: ['A', 'B'],
      },
    ];
    const result = hitungTagihan(sesi, pemain, CONFIG);
    const tA = result.tagihan_per_pemain.find((t) => t.pemain_id === 'A')!;
    const tB = result.tagihan_per_pemain.find((t) => t.pemain_id === 'B')!;

    // 5000 bola + 10000 lapangan = 15000
    expect(tA.biaya_bola_raw).toBe(5000);
    expect(tA.tagihan).toBe(15000);
    expect(tB.tagihan).toBe(15000);
    expect(result.total_tagihan).toBe(30000);
  });

  // (c) session with 4 balls
  it('session with 4 balls among 3 non-members charges full 4 balls per player', () => {
    const pemain: PemainInput[] = [
      nonMember('A'),
      nonMember('B'),
      nonMember('C'),
    ];
    const sesi: SesiInput[] = [
      {
        id: 's1',
        lapangan: 1,
        bola_terpakai: 4, // 4 * 5000 = 20000
        ditanggung_oleh_pemain_id: null,
        pemain_ids: ['A', 'B', 'C'],
      },
    ];
    const result = hitungTagihan(sesi, pemain, CONFIG);
    for (const t of result.tagihan_per_pemain) {
      expect(t.biaya_bola_raw).toBe(20000);
      // 20000 + 10000 lapangan = 30000
      expect(t.tagihan).toBe(30000);
    }
    expect(result.total_bola_terpakai).toBe(4);
  });

  // (d) multiple players per session
  it('non-members with 1 ball pay 5000 bola + 10000 lapangan = 15000', () => {
    const pemain: PemainInput[] = [
      nonMember('A'),
      nonMember('B'),
      nonMember('C'),
      nonMember('D'),
    ];
    const sesi: SesiInput[] = [
      {
        id: 's1',
        lapangan: 1,
        bola_terpakai: 1, // 5000 each
        ditanggung_oleh_pemain_id: null,
        pemain_ids: ['A', 'B', 'C', 'D'],
      },
    ];
    const result = hitungTagihan(sesi, pemain, CONFIG);
    for (const t of result.tagihan_per_pemain) {
      expect(t.biaya_bola_raw).toBe(5000);
      expect(t.biaya_lapangan_raw).toBe(10000);
      expect(t.tagihan).toBe(15000);
      expect(t.jumlah_sesi).toBe(1);
    }
    expect(result.total_tagihan).toBe(4 * 15000);
  });
});
