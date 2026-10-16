// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, sum } from 'drizzle-orm';
import { db } from '@/db';
import { transaksi_kas, kategori_kas } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';
import {
  calculateSetSaldoAdjustment,
  calculateTambahKurangAdjustment,
} from '@/lib/kas-adjustment';

const penyesuaianSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('set_saldo'),
    target_saldo: z.number().int().min(0, 'Target saldo harus minimal 0'),
    alasan: z.string().optional().default(''),
  }),
  z.object({
    mode: z.literal('tambah_kurang'),
    operasi: z.enum(['+', '-']),
    nominal: z.number().int().min(1, 'Nominal harus lebih dari 0'),
    alasan: z.string().min(1, 'Alasan penyesuaian wajib diisi'),
  }),
]);

/**
 * Helper to compute current cash balance for a group.
 */
async function getCurrentSaldoKas(dbClient: ReturnType<typeof db>, grupId: string) {
  const [pemasukanAll, pengeluaranAll] = await Promise.all([
    dbClient
      .select({ total: sum(transaksi_kas.nominal) })
      .from(transaksi_kas)
      .where(and(eq(transaksi_kas.grup_id, grupId), eq(transaksi_kas.tipe, 'pemasukan'))),
    dbClient
      .select({ total: sum(transaksi_kas.nominal) })
      .from(transaksi_kas)
      .where(and(eq(transaksi_kas.grup_id, grupId), eq(transaksi_kas.tipe, 'pengeluaran'))),
  ]);

  const totalPemasukan = parseInt(pemasukanAll[0]?.total ?? '0', 10) || 0;
  const totalPengeluaran = parseInt(pengeluaranAll[0]?.total ?? '0', 10) || 0;
  const saldoSaatIni = totalPemasukan - totalPengeluaran;

  return {
    saldo_saat_ini: saldoSaatIni,
    total_pemasukan: totalPemasukan,
    total_pengeluaran: totalPengeluaran,
  };
}

/**
 * Helper to find or create a 'Penyesuaian Kas' category for the group.
 */
async function getOrCreatePenyesuaianKategori(
  dbClient: ReturnType<typeof db>,
  grupId: string,
  tipe: 'pemasukan' | 'pengeluaran'
): Promise<string> {
  const existing = await dbClient
    .select({ id: kategori_kas.id })
    .from(kategori_kas)
    .where(
      and(
        eq(kategori_kas.grup_id, grupId),
        eq(kategori_kas.nama, 'Penyesuaian Kas'),
        eq(kategori_kas.tipe, tipe)
      )
    )
    .limit(1);

  if (existing[0]) {
    return existing[0].id;
  }

  const inserted = await dbClient
    .insert(kategori_kas)
    .values({
      grup_id: grupId,
      nama: 'Penyesuaian Kas',
      tipe,
      adalah_sistem: true,
      aktif: true,
    })
    .returning({ id: kategori_kas.id });

  return inserted[0].id;
}

export async function GET() {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  try {
    const dbClient = db();
    const balanceInfo = await getCurrentSaldoKas(dbClient, ctx.grupId);
    return successResponse(balanceInfo);
  } catch (err) {
    console.error('[GET /kas/penyesuaian]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

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

  const parsed = penyesuaianSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const dbClient = db();
    const { saldo_saat_ini: currentSaldo } = await getCurrentSaldoKas(dbClient, ctx.grupId);

    let tipe: 'pemasukan' | 'pengeluaran';
    let nominal: number;
    let finalAlasan: string;
    let diff: number;

    if (parsed.data.mode === 'set_saldo') {
      try {
        const result = calculateSetSaldoAdjustment({
          currentSaldo,
          targetSaldo: parsed.data.target_saldo,
          customAlasan: parsed.data.alasan,
        });
        tipe = result.tipe;
        nominal = result.nominal;
        diff = result.diff;
        finalAlasan = result.alasan;
      } catch (err: unknown) {
        return errorResponse(err instanceof Error ? err.message : 'Penyesuaian gagal', undefined, 422);
      }
    } else {
      try {
        const result = calculateTambahKurangAdjustment({
          currentSaldo,
          operasi: parsed.data.operasi,
          nominal: parsed.data.nominal,
          alasan: parsed.data.alasan,
        });
        tipe = result.tipe;
        nominal = result.nominal;
        diff = result.diff;
        finalAlasan = result.alasan;
      } catch (err: unknown) {
        return errorResponse(err instanceof Error ? err.message : 'Penyesuaian gagal', undefined, 422);
      }
    }

    const kategoriId = await getOrCreatePenyesuaianKategori(dbClient, ctx.grupId, tipe);

    const rows = await dbClient
      .insert(transaksi_kas)
      .values({
        grup_id: ctx.grupId,
        kategori_id: kategoriId,
        nominal,
        tipe,
        keterangan: finalAlasan,
        referensi_tipe: 'penyesuaian_kas',
        dapat_diubah: true,
        dibuat_oleh_admin_id: ctx.adminId,
      })
      .returning();

    const newSaldo = currentSaldo + (tipe === 'pemasukan' ? nominal : -nominal);

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'KOREKSI_KAS',
      entitas: 'transaksi_kas',
      entitasId: rows[0].id,
      alasan: finalAlasan,
      detail: {
        mode: parsed.data.mode,
        nominal,
        tipe,
        diff,
        saldo_sebelum: currentSaldo,
        saldo_sesudah: newSaldo,
      },
    });

    return successResponse(
      {
        transaksi: rows[0],
        saldo_saat_ini: newSaldo,
      },
      'Penyesuaian kas berhasil dicatat',
      201
    );
  } catch (err) {
    console.error('[POST /kas/penyesuaian]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
