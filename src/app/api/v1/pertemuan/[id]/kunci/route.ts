// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and, count } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, peserta_pertemuan } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId } = await params;

  try {
    const dbClient = db();

    const ptRows = await dbClient
      .select()
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    if (ptRows[0].terkunci) return errorResponse('Pertemuan sudah terkunci', undefined, 400);

    // Check all peserta are 'lunas'
    const [totalPeserta, lunasPeserta] = await Promise.all([
      dbClient
        .select({ count: count() })
        .from(peserta_pertemuan)
        .where(
          and(
            eq(peserta_pertemuan.pertemuan_id, pertemuanId),
            eq(peserta_pertemuan.grup_id, ctx.grupId)
          )
        ),
      dbClient
        .select({ count: count() })
        .from(peserta_pertemuan)
        .where(
          and(
            eq(peserta_pertemuan.pertemuan_id, pertemuanId),
            eq(peserta_pertemuan.grup_id, ctx.grupId),
            eq(peserta_pertemuan.status_main, 'lunas')
          )
        ),
    ]);

    const total = totalPeserta[0]?.count ?? 0;
    const lunas = lunasPeserta[0]?.count ?? 0;

    if (total === 0) {
      return errorResponse('Tidak ada peserta dalam pertemuan', undefined, 400);
    }

    if (total !== lunas) {
      return errorResponse(
        `Masih ada ${total - lunas} peserta yang belum lunas`,
        undefined,
        400
      );
    }

    await dbClient
      .update(pertemuan)
      .set({ terkunci: true })
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'KUNCI',
      entitas: 'pertemuan',
      entitasId: pertemuanId,
    });

    return successResponse({ terkunci: true }, 'Pertemuan berhasil dikunci');
  } catch (err) {
    console.error('[POST /pertemuan/[id]/kunci]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
