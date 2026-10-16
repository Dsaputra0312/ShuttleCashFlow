// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const bukaKunciSchema = z.object({
  alasan: z.string().min(1, 'Alasan wajib diisi'),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = bukaKunciSchema.safeParse(body);
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

    const ptRows = await dbClient
      .select()
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    if (!ptRows[0].terkunci) return errorResponse('Pertemuan tidak dalam keadaan terkunci', undefined, 400);

    await dbClient
      .update(pertemuan)
      .set({ terkunci: false })
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'BUKA_KUNCI',
      entitas: 'pertemuan',
      entitasId: pertemuanId,
      alasan,
    });

    return successResponse({ terkunci: false }, 'Pertemuan berhasil dibuka kunci');
  } catch (err) {
    console.error('[POST /pertemuan/[id]/buka-kunci]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
