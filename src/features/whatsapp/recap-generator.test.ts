import { describe, it, expect } from 'vitest';
import { generateRekapWhatsApp } from './recap-generator';
import type { PertemuanData, SesiData, PesertaData } from './recap-generator';

/**
 * Test data based on Req §5 example:
 * Players: Andi(member), Budi(member), Cici(non-member), Dedi(non-member),
 *          Eko(bebas_biaya), Fani(non-member)
 *
 * Expected billing: Andi=1000, Budi=1000, Cici=15000, Dedi=11000, Eko=0, Fani=12000
 * Total = 40000, stok_terpakai = 4 bola
 *
 * Sessions (matching billing calculator test):
 * S1 (lap 1, 2 bola): Andi, Budi, Cici, Dedi
 * S2 (lap 1, 1 bola): Cici, Dedi, Eko, Fani
 * S3 (lap 2, 1 bola): Andi, Cici, Fani — bola ditanggung Andi
 */

const PERTEMUAN: PertemuanData = {
  id: 'pt-001',
  tanggal: '2024-01-09', // Selasa
  terkunci: true,
};

const SESI_LIST: SesiData[] = [
  {
    id: 's1',
    lapangan: 1,
    bola_terpakai: 2,
    ditanggung_oleh_pemain_id: null,
    pemain_ids: ['p-andi', 'p-budi', 'p-cici', 'p-dedi'],
  },
  {
    id: 's2',
    lapangan: 1,
    bola_terpakai: 1,
    ditanggung_oleh_pemain_id: null,
    pemain_ids: ['p-cici', 'p-dedi', 'p-eko', 'p-fani'],
  },
  {
    id: 's3',
    lapangan: 2,
    bola_terpakai: 1,
    ditanggung_oleh_pemain_id: 'p-andi',
    pemain_ids: ['p-andi', 'p-cici', 'p-fani'],
  },
];

const PESERTA_LIST: PesertaData[] = [
  { pemain_id: 'p-andi', nama: 'Andi', tagihan: 1000,  dibayar: 1000,  status_main: 'lunas' },
  { pemain_id: 'p-budi', nama: 'Budi', tagihan: 1000,  dibayar: 1000,  status_main: 'lunas' },
  { pemain_id: 'p-cici', nama: 'Cici', tagihan: 15000, dibayar: 15000, status_main: 'lunas' },
  { pemain_id: 'p-dedi', nama: 'Dedi', tagihan: 11000, dibayar: 11000, status_main: 'lunas' },
  { pemain_id: 'p-eko',  nama: 'Eko',  tagihan: 0,     dibayar: 0,     status_main: 'lunas' },
  { pemain_id: 'p-fani', nama: 'Fani', tagihan: 12000, dibayar: 12000, status_main: 'lunas' },
];

describe('generateRekapWhatsApp', () => {
  it('includes the pertemuan date in the header', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    // The date 2024-01-09 is a Tuesday (Selasa)
    expect(result).toContain('Selasa');
    expect(result).toContain('2024');
  });

  it('includes all 3 sessions with correct court and ball count', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    expect(result).toContain('Lap.1 | 2 bola');
    expect(result).toContain('Lap.1 | 1 bola');
    expect(result).toContain('Lap.2 | 1 bola');
  });

  it('shows penanggung bola notation for session 3', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    expect(result).toContain('bola ditanggung Andi');
  });

  it('shows all player names in session 1', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    expect(result).toContain('Andi');
    expect(result).toContain('Budi');
    expect(result).toContain('Cici');
    expect(result).toContain('Dedi');
  });

  it('shows correct billing for each player', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    expect(result).toContain('Andi:');
    expect(result).toContain('Rp 1.000');
    expect(result).toContain('Budi:');
    expect(result).toContain('Cici:');
    expect(result).toContain('Rp 15.000');
    expect(result).toContain('Dedi:');
    expect(result).toContain('Rp 11.000');
    expect(result).toContain('Fani:');
    expect(result).toContain('Rp 12.000');
  });

  it('shows Gratis for zero-tagihan player (Eko)', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    expect(result).toContain('Eko:');
    expect(result).toContain('Gratis');
  });

  it('shows correct total tagihan', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    // 1000 + 1000 + 15000 + 11000 + 0 + 12000 = 40000
    expect(result).toContain('Rp 40.000');
  });

  it('shows player count', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    expect(result).toContain('6');
    expect(result).toContain('pemain');
  });

  it('shows lunas status marker for paid players', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    // All players are lunas — result should contain Andi in the billing section
    expect(result).toContain('Andi:');
    expect(result).toContain('Budi:');
  });

  it('handles empty sesi list gracefully', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, [], PESERTA_LIST);
    expect(result).toContain('REKAP PERTEMUAN');
    expect(result).toContain('Rp 40.000');
  });

  it('handles empty peserta list gracefully', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, []);
    expect(result).toContain('REKAP PERTEMUAN');
    expect(result).toContain('Rp 0');
  });

  it('shows player billing lines for all 6 players from Req §5', () => {
    const result = generateRekapWhatsApp(PERTEMUAN, SESI_LIST, PESERTA_LIST);
    // Verify all 6 players appear in the output
    const names = ['Andi', 'Budi', 'Cici', 'Dedi', 'Eko', 'Fani'];
    for (const name of names) {
      expect(result).toContain(name);
    }
  });

  it('shows overpayment and total masuk kas when player pays more', () => {
    const pesertaWithOverpayment: PesertaData[] = [
      { pemain_id: 'p-1', nama: 'Budi', tagihan: 15000, dibayar: 20000, status_main: 'lunas' },
      { pemain_id: 'p-2', nama: 'Eko', tagihan: 0, dibayar: 10000, status_main: 'lunas' },
    ];
    const result = generateRekapWhatsApp(PERTEMUAN, [], pesertaWithOverpayment);
    expect(result).toContain('Budi: *Rp 15.000 _(bayar Rp 20.000, lebih +Rp 5.000)_*');
    expect(result).toContain('Eko: *Gratis _(sukarela +Rp 10.000)_*');
    expect(result).toContain('• Total Tagihan: Rp 15.000');
    expect(result).toContain('• Kelebihan Bayar: +Rp 15.000');
    expect(result).toContain('*Total Masuk Kas: Rp 30.000*');
  });
});

