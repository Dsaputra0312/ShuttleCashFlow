import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { koreksi_stok } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const koreksiSchema = z.object({
  jumlah: z.number().int(),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
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

  const parsed = koreksiSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  const { jumlah, alasan } = parsed.data;

  // Validate alasan is non-empty (already done by schema, but explicit 422 per spec)
  if (!alasan.trim()) {
    return errorResponse('Alasan wajib diisi', { alasan: ['Alasan tidak boleh kosong'] }, 422);
  }

  try {
    const dbClient = db();

    const rows = await dbClient
      .insert(koreksi_stok)
      .values({
        grup_id: ctx.grupId,
        jumlah,
        alasan,
        dibuat_oleh_admin_id: ctx.adminId,
      })
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'KOREKSI_STOK',
      entitas: 'koreksi_stok',
      entitasId: rows[0].id,
      alasan,
      detail: { jumlah },
    });

    return successResponse(rows[0], 'Koreksi stok berhasil dicatat', 201);
  } catch (err) {
    console.error('[POST /stok/koreksi]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
