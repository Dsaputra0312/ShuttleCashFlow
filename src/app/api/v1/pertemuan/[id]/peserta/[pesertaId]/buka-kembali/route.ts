// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, peserta_pertemuan } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { reverseTransactions } from '@/features/kas/auto-transactions';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const bukaKembaliSchema = z.object({
  alasan: z.string().min(1, 'Alasan wajib diisi'),
});

type Params = { params: Promise<{ id: string; pesertaId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId, pesertaId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = bukaKembaliSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  const { alasan } = parsed.data;

  try {
    const dbClient = db();

    // Load pertemuan
    const ptRows = await dbClient
      .select({ terkunci: pertemuan.terkunci })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    if (ptRows[0].terkunci) return errorResponse('Pertemuan terkunci', undefined, 400);

    // Load peserta
    const pesertaRows = await dbClient
      .select()
      .from(peserta_pertemuan)
      .where(
        and(
          eq(peserta_pertemuan.id, pesertaId),
          eq(peserta_pertemuan.pertemuan_id, pertemuanId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      )
      .limit(1);

    if (!pesertaRows[0]) return errorResponse('Peserta tidak ditemukan', undefined, 404);
    const peserta = pesertaRows[0];

    if (peserta.status_main !== 'lunas' && peserta.status_main !== 'selesai') {
      return errorResponse('Peserta tidak dalam status lunas atau selesai', undefined, 400);
    }

    // Reverse auto-transactions for this peserta
    await reverseTransactions(dbClient, 'peserta_pertemuan', pesertaId);

    // Reset peserta
    const updated = await dbClient
      .update(peserta_pertemuan)
      .set({
        status_main: 'bermain',
        tagihan: 0,
        dibayar: 0,
        metode_bayar: null,
        selesai_pada: null,
      })
      .where(
        and(
          eq(peserta_pertemuan.id, pesertaId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      )
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'BUKA_KEMBALI',
      entitas: 'peserta_pertemuan',
      entitasId: pesertaId,
      alasan,
      detail: {
        tagihan_sebelumnya: peserta.tagihan,
        dibayar_sebelumnya: peserta.dibayar,
        status_sebelumnya: peserta.status_main,
      },
    });

    return successResponse(updated[0], 'Peserta berhasil dibuka kembali');
  } catch (err) {
    console.error('[POST /pertemuan/[id]/peserta/[pesertaId]/buka-kembali]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
