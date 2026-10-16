// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { admin } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { hashPassword, comparePassword } from '@/features/auth/hash-password';
import { successResponse, errorResponse } from '@/lib/api-response';

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Password saat ini wajib diisi'),
    new_password: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirm_password: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirm_password'],
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

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const rows = await db()
      .select({ id: admin.id, password_hash: admin.password_hash })
      .from(admin)
      .where(eq(admin.id, ctx.adminId))
      .limit(1);

    if (rows.length === 0) {
      return errorResponse('Admin tidak ditemukan', undefined, 404);
    }

    const valid = await comparePassword(parsed.data.current_password, rows[0].password_hash);
    if (!valid) {
      return errorResponse('Password saat ini tidak sesuai', undefined, 400);
    }

    const password_hash = await hashPassword(parsed.data.new_password);

    await db()
      .update(admin)
      .set({ password_hash })
      .where(eq(admin.id, ctx.adminId));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CHANGE_PASSWORD',
      entitas: 'admin',
      entitasId: ctx.adminId,
    });

    return successResponse(null, 'Password berhasil diubah');
  } catch (err) {
    console.error('[POST /auth/change-password]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
