// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { iuran } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { reverseTransactions } from '@/features/kas/auto-transactions';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  try {
    const dbClient = db();

    const iuranRows = await dbClient
      .select()
      .from(iuran)
      .where(and(eq(iuran.id, id), eq(iuran.grup_id, ctx.grupId)))
      .limit(1);

    if (!iuranRows[0]) {
      return errorResponse('Data iuran tidak ditemukan', undefined, 404);
    }

    const current = iuranRows[0];

    // If it had generated a kas transaction, reverse it
    if (current.status === 'lunas') {
      await reverseTransactions(dbClient, 'iuran', id);
    }

    // Delete the iuran record
    await dbClient
      .delete(iuran)
      .where(and(eq(iuran.id, id), eq(iuran.grup_id, ctx.grupId)));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'DELETE',
      entitas: 'iuran',
      entitasId: id,
      alasan: 'Pembatalan iuran / membership',
      detail: {
        pemain_id: current.pemain_id,
        periode_tahun: current.periode_tahun,
        periode_bulan: current.periode_bulan,
        status: current.status,
      },
    });

    return successResponse(null, 'Membership / iuran berhasil dibatalkan');
  } catch (err) {
    console.error('[DELETE /iuran/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
