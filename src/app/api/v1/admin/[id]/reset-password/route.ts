// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { admin } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { hashPassword } from '@/features/auth/hash-password';
import { successResponse, errorResponse } from '@/lib/api-response';

const resetPasswordSchema = z.object({
  new_password: z.string().min(8, 'Password baru minimal 8 karakter'),
  alasan: z.string().min(1, 'Alasan wajib diisi'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const target = await db()
      .select({ id: admin.id, nama: admin.nama })
      .from(admin)
      .where(and(eq(admin.id, id), eq(admin.grup_id, ctx.grupId)))
      .limit(1);

    if (target.length === 0) {
      return errorResponse('Admin tidak ditemukan', undefined, 404);
    }

    const password_hash = await hashPassword(parsed.data.new_password);

    await db()
      .update(admin)
      .set({ password_hash })
      .where(and(eq(admin.id, id), eq(admin.grup_id, ctx.grupId)));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'RESET_PASSWORD',
      entitas: 'admin',
      entitasId: id,
      detail: { target_nama: target[0].nama },
      alasan: parsed.data.alasan,
    });

    return successResponse(null, 'Password berhasil direset');
  } catch (err) {
    console.error('[POST /admin/[id]/reset-password]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
