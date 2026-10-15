import { eq, and } from 'drizzle-orm';
import type { Database } from '@/db';
import { transaksi_kas, kategori_kas } from '@/db/schema';

/**
 * Find a system kategori by name for a grup.
 * Returns null if not found.
 */
async function findKategori(
  db: Database,
  grupId: string,
  nama: string
): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: kategori_kas.id })
    .from(kategori_kas)
    .where(and(eq(kategori_kas.grup_id, grupId), eq(kategori_kas.nama, nama)))
    .limit(1);
  return rows[0] ?? null;
}

export interface TagihanTransactionParams {
  grupId: string;
  pertemuanId: string;
  pesertaId: string;
  pemainId: string;
  adminId: string;
  tagihan: number;
  dibayar: number;
}

/**
 * Create pemasukan kas record(s) when a player pays their bill.
 * - If tagihan > 0: record "Tagihan Pertemuan" pemasukan for tagihan amount.
 * - If dibayar > tagihan: also record "Kelebihan Bayar" pemasukan for the excess.
 * Both records are dapat_diubah=false (auto-transactions).
 */
export async function createTagihanTransaction(
  db: Database,
  params: TagihanTransactionParams
): Promise<void> {
  const { grupId, pertemuanId, pesertaId, pemainId, adminId, tagihan, dibayar } = params;

  if (tagihan > 0) {
    const kategori = await findKategori(db, grupId, 'Tagihan Pertemuan');
    await db.insert(transaksi_kas).values({
      grup_id: grupId,
      kategori_id: kategori?.id ?? null,
      nominal: tagihan,
      tipe: 'pemasukan',
      keterangan: `Tagihan pertemuan pemain ${pemainId}`,
      referensi_tipe: 'peserta_pertemuan',
      referensi_id: pesertaId,
      pertemuan_id: pertemuanId,
      dapat_diubah: false,
      dibuat_oleh_admin_id: adminId,
    });
  }

  const kelebihan = dibayar - tagihan;
  if (kelebihan > 0) {
    const kategori = await findKategori(db, grupId, 'Kelebihan Bayar');
    await db.insert(transaksi_kas).values({
      grup_id: grupId,
      kategori_id: kategori?.id ?? null,
      nominal: kelebihan,
      tipe: 'pemasukan',
      keterangan: `Kelebihan bayar pertemuan pemain ${pemainId}`,
      referensi_tipe: 'peserta_pertemuan',
      referensi_id: pesertaId,
      pertemuan_id: pertemuanId,
      dapat_diubah: false,
      dibuat_oleh_admin_id: adminId,
    });
  }

  // bebas_biaya case: tagihan=0 but dibayar>0, all goes to kelebihan
  if (tagihan === 0 && dibayar > 0) {
    const kategori = await findKategori(db, grupId, 'Kelebihan Bayar');
    await db.insert(transaksi_kas).values({
      grup_id: grupId,
      kategori_id: kategori?.id ?? null,
      nominal: dibayar,
      tipe: 'pemasukan',
      keterangan: `Sukarela/kelebihan bayar pemain ${pemainId}`,
      referensi_tipe: 'peserta_pertemuan',
      referensi_id: pesertaId,
      pertemuan_id: pertemuanId,
      dapat_diubah: false,
      dibuat_oleh_admin_id: adminId,
    });
  }
}

/**
 * Reverse (delete) all auto-transactions linked to a referensi.
 * Called when buka-kembali resets a player's payment.
 */
export async function reverseTransactions(
  db: Database,
  referensiTipe: string,
  referensiId: string
): Promise<void> {
  await db
    .delete(transaksi_kas)
    .where(
      and(
        eq(transaksi_kas.referensi_tipe, referensiTipe),
        eq(transaksi_kas.referensi_id, referensiId),
        eq(transaksi_kas.dapat_diubah, false)
      )
    );
}

export interface IuranTransactionParams {
  grupId: string;
  pemainId: string;
  adminId: string;
  iuranId: string;
  nominal: number;
}

/**
 * Create pemasukan kas record for iuran payment.
 * dapat_diubah=false (auto-transaction).
 */
export async function createIuranTransaction(
  db: Database,
  params: IuranTransactionParams
): Promise<void> {
  const { grupId, pemainId, adminId, iuranId, nominal } = params;
  const kategori = await findKategori(db, grupId, 'Iuran Bulanan');
  await db.insert(transaksi_kas).values({
    grup_id: grupId,
    kategori_id: kategori?.id ?? null,
    nominal,
    tipe: 'pemasukan',
    keterangan: `Iuran bulanan pemain ${pemainId}`,
    referensi_tipe: 'iuran',
    referensi_id: iuranId,
    dapat_diubah: false,
    dibuat_oleh_admin_id: adminId,
  });
}
