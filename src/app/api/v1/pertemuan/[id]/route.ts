// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, count } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, sesi, peserta_pertemuan } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const updatePertemuanSchema = z.object({
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
});

async function findPertemuan(grupId: string, id: string) {
  const rows = await db()
    .select()
    .from(pertemuan)
    .where(and(eq(pertemuan.id, id), eq(pertemuan.grup_id, grupId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  try {
    const row = await findPertemuan(ctx.grupId, id);
    if (!row) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    const [sesiCount, pesertaCount] = await Promise.all([
      db()
        .select({ count: count() })
        .from(sesi)
        .where(and(eq(sesi.pertemuan_id, id), eq(sesi.grup_id, ctx.grupId))),
      db()
        .select({ count: count() })
        .from(peserta_pertemuan)
        .where(and(eq(peserta_pertemuan.pertemuan_id, id), eq(peserta_pertemuan.grup_id, ctx.grupId))),
    ]);

    return successResponse({
      ...row,
      jumlah_sesi: sesiCount[0]?.count ?? 0,
      jumlah_peserta: pesertaCount[0]?.count ?? 0,
    });
  } catch (err) {
    console.error('[GET /pertemuan/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  try {
    const row = await findPertemuan(ctx.grupId, id);
    if (!row) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    if (row.terkunci) {
      return errorResponse('Pertemuan terkunci, tidak dapat dihapus', undefined, 400);
    }

    const sesiRows = await db()
      .select({ count: count() })
      .from(sesi)
      .where(and(eq(sesi.pertemuan_id, id), eq(sesi.grup_id, ctx.grupId)));

    if ((sesiRows[0]?.count ?? 0) > 0) {
      return errorResponse(
        'Pertemuan tidak dapat dihapus karena sudah ada sesi',
        undefined,
        400
      );
    }

    await db()
      .delete(pertemuan)
      .where(and(eq(pertemuan.id, id), eq(pertemuan.grup_id, ctx.grupId)));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'DELETE',
      entitas: 'pertemuan',
      entitasId: id,
      detail: { tanggal: row.tanggal },
    });

    return successResponse(null, 'Pertemuan berhasil dihapus');
  } catch (err) {
    console.error('[DELETE /pertemuan/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

export async function PATCH(
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
    body = {};
  }

  const parsed = updatePertemuanSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const row = await findPertemuan(ctx.grupId, id);
    if (!row) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    if (row.terkunci) {
      return errorResponse('Pertemuan terkunci, tidak dapat diubah', undefined, 400);
    }

    const updated = await db()
      .update(pertemuan)
      .set({
        tanggal: parsed.data.tanggal,
        diperbarui_pada: new Date(),
      })
      .where(and(eq(pertemuan.id, id), eq(pertemuan.grup_id, ctx.grupId)))
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'pertemuan',
      entitasId: id,
      detail: { tanggal_lama: row.tanggal, tanggal_baru: parsed.data.tanggal },
    });

    return successResponse(updated[0], 'Tanggal pertemuan berhasil diperbarui');
  } catch (err) {
    console.error('[PATCH /pertemuan/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
