// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { pembelian_bola, transaksi_kas, kategori_kas, konfigurasi_grup } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const beliSchema = z.object({
  jumlah_tabung: z.number().int().min(1, 'Jumlah tabung minimal 1'),
  harga_total: z.number().int().min(1, 'Harga total harus lebih dari 0'),
});

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = beliSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  const { jumlah_tabung, harga_total } = parsed.data;

  try {
    const dbClient = db();

    // Load config for isi_per_tabung
    const konfigs = await dbClient
      .select({ isi_per_tabung: konfigurasi_grup.isi_per_tabung })
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    const isiPerTabung = konfigs[0]?.isi_per_tabung ?? 12;

    // Find kategori 'Pembelian Bola'
    const kategoriRows = await dbClient
      .select({ id: kategori_kas.id })
      .from(kategori_kas)
      .where(
        and(
          eq(kategori_kas.grup_id, ctx.grupId),
          eq(kategori_kas.nama, 'Pembelian Bola')
        )
      )
      .limit(1);

    // Create transaksi_kas pengeluaran
    const kasRows = await dbClient
      .insert(transaksi_kas)
      .values({
        grup_id: ctx.grupId,
        kategori_id: kategoriRows[0]?.id ?? null,
        nominal: harga_total,
        tipe: 'pengeluaran',
        keterangan: `Pembelian bola ${jumlah_tabung} tabung`,
        referensi_tipe: 'pembelian_bola',
        dapat_diubah: false,
        dibuat_oleh_admin_id: ctx.adminId,
      })
      .returning();

    // Insert pembelian_bola
    const pembelianRows = await dbClient
      .insert(pembelian_bola)
      .values({
        grup_id: ctx.grupId,
        jumlah_tabung,
        isi_per_tabung: isiPerTabung,
        harga_total,
        transaksi_kas_id: kasRows[0].id,
      })
      .returning();

    // Update referensi_id on transaksi_kas
    await dbClient
      .update(transaksi_kas)
      .set({ referensi_id: pembelianRows[0].id })
      .where(eq(transaksi_kas.id, kasRows[0].id));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'pembelian_bola',
      entitasId: pembelianRows[0].id,
      detail: { jumlah_tabung, isi_per_tabung: isiPerTabung, harga_total },
    });

    return successResponse(
      {
        pembelian: pembelianRows[0],
        total_bola_dibeli: jumlah_tabung * isiPerTabung,
      },
      'Pembelian bola berhasil dicatat',
      201
    );
  } catch (err) {
    console.error('[POST /stok/beli]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
