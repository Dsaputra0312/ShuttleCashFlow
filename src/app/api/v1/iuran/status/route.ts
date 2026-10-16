// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { iuran } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const sp = request.nextUrl.searchParams;
  const pemainId = sp.get('pemain_id');
  const tahun = sp.get('tahun');
  const bulan = sp.get('bulan');

  if (!pemainId) {
    return errorResponse('pemain_id wajib diisi', undefined, 400);
  }

  const now = new Date();
  const currentYear = tahun ? parseInt(tahun, 10) : now.getFullYear();
  const currentMonth = bulan ? parseInt(bulan, 10) : now.getMonth() + 1;

  try {
    const rows = await db()
      .select({ id: iuran.id, nominal: iuran.nominal })
      .from(iuran)
      .where(
        and(
          eq(iuran.grup_id, ctx.grupId),
          eq(iuran.pemain_id, pemainId),
          eq(iuran.periode_tahun, currentYear),
          eq(iuran.periode_bulan, currentMonth)
        )
      )
      .limit(1);

    const is_member = rows.length > 0;

    return successResponse({
      pemain_id: pemainId,
      periode_tahun: currentYear,
      periode_bulan: currentMonth,
      is_member,
      iuran: rows[0] ?? null,
    });
  } catch (err) {
    console.error('[GET /iuran/status]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
