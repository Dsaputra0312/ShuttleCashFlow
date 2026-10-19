export interface SetSaldoInput {
  currentSaldo: number;
  targetSaldo: number;
  customAlasan?: string;
}

export interface SetSaldoResult {
  tipe: 'pemasukan' | 'pengeluaran';
  nominal: number;
  diff: number;
  alasan: string;
}

export interface TambahKurangInput {
  currentSaldo: number;
  operasi: '+' | '-';
  nominal: number;
  alasan: string;
}

export interface TambahKurangResult {
  tipe: 'pemasukan' | 'pengeluaran';
  nominal: number;
  diff: number;
  newSaldo: number;
  alasan: string;
}

/**
 * Calculates the adjustment needed when setting an exact physical cash balance (Stok/Saldo Opname).
 */
export function calculateSetSaldoAdjustment(input: SetSaldoInput): SetSaldoResult {
  const { currentSaldo, targetSaldo, customAlasan } = input;
  const diff = targetSaldo - currentSaldo;

  if (diff === 0) {
    throw new Error('Target saldo sama dengan saldo saat ini (tidak ada perubahan)');
  }

  const tipe: 'pemasukan' | 'pengeluaran' = diff > 0 ? 'pemasukan' : 'pengeluaran';
  const nominal = Math.abs(diff);
  const alasan = customAlasan?.trim() || `Pencatatan sisa fisik kas`;

  return {
    tipe,
    nominal,
    diff,
    alasan,
  };
}

/**
 * Calculates the adjustment when directly adding or subtracting an amount from cash.
 */
export function calculateTambahKurangAdjustment(input: TambahKurangInput): TambahKurangResult {
  const { currentSaldo, operasi, nominal, alasan } = input;

  if (!nominal || nominal <= 0) {
    throw new Error('Nominal harus lebih dari 0');
  }

  if (!alasan || !alasan.trim()) {
    throw new Error('Alasan penyesuaian kas wajib diisi');
  }

  const tipe: 'pemasukan' | 'pengeluaran' = operasi === '+' ? 'pemasukan' : 'pengeluaran';
  const diff = operasi === '+' ? nominal : -nominal;
  const newSaldo = currentSaldo + diff;

  return {
    tipe,
    nominal,
    diff,
    newSaldo,
    alasan: alasan.trim(),
  };
}
