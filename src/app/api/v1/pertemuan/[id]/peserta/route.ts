import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, peserta_pertemuan } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { successResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
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
      .select({ id: pertemuan.id })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    const rows = await dbClient
      .select()
      .from(peserta_pertemuan)
      .where(
        and(
          eq(peserta_pertemuan.pertemuan_id, pertemuanId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      );

    return successResponse(rows);
  } catch (err) {
    console.error('[GET /pertemuan/[id]/peserta]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
