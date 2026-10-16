// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { konfigurasi_grup } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const konfigurasiSchema = z.object({
  harga_bola_per_biji: z.number().int().min(0).optional(),
  isi_per_tabung: z.number().int().min(0).optional(),
  biaya_lapangan_non_member: z.number().int().min(0).optional(),
  iuran_bulanan: z.number().int().min(0).optional(),
  kelipatan_pembulatan: z.number().int().min(0).optional(),
  hari_main: z.array(z.number().int().min(0).max(6)).optional(),
  biaya_sewa_default: z.number().int().min(0).optional(),
  stok_awal: z.number().int().min(0).optional(),
});

export async function GET() {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  try {
    const rows = await db()
      .select()
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    if (rows.length === 0) {
      return errorResponse('Konfigurasi tidak ditemukan', undefined, 404);
    }

    return successResponse(rows[0]);
  } catch (err) {
    console.error('[GET /konfigurasi]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

export async function PUT(request: NextRequest) {
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

  const parsed = konfigurasiSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const values = {
      grup_id: ctx.grupId,
      ...parsed.data,
      diperbarui_pada: new Date(),
    };

    await db()
      .insert(konfigurasi_grup)
      .values(values)
      .onConflictDoUpdate({
        target: konfigurasi_grup.grup_id,
        set: { ...parsed.data, diperbarui_pada: new Date() },
      });

    const rows = await db()
      .select()
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'konfigurasi_grup',
      entitasId: ctx.grupId,
      detail: parsed.data as Record<string, unknown>,
    });

    return successResponse(rows[0], 'Konfigurasi berhasil diperbarui');
  } catch (err) {
    console.error('[PUT /konfigurasi]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
