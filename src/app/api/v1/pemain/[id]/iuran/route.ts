import { NextRequest } from 'next/server';
import { eq, and, count, desc } from 'drizzle-orm';
import { db } from '@/db';
import { iuran, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { parseListQuery } from '@/lib/query-helpers';
import { paginatedResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pemainId } = await params;

  const parsed = parseListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;

  const { page, per_page } = parsed.query;
  const offset = (page - 1) * per_page;

  try {
    const dbClient = db();

    // Validate pemain exists in grup
    const pemainRows = await dbClient
      .select({ id: pemain.id })
      .from(pemain)
      .where(and(eq(pemain.id, pemainId), eq(pemain.grup_id, ctx.grupId)))
      .limit(1);

    if (!pemainRows[0]) return errorResponse('Pemain tidak ditemukan', undefined, 404);

    const condition = and(
      eq(iuran.grup_id, ctx.grupId),
      eq(iuran.pemain_id, pemainId)
    );

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(iuran).where(condition),
      dbClient
        .select()
        .from(iuran)
        .where(condition)
        .orderBy(desc(iuran.periode_tahun), desc(iuran.periode_bulan))
        .limit(per_page)
        .offset(offset),
    ]);

    const total = totalRows[0]?.count ?? 0;
    return paginatedResponse(rows, {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
    });
  } catch (err) {
    console.error('[GET /pemain/[id]/iuran]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
