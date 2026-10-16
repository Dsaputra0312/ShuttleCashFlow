// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { transaksi_kas, kategori_kas, pertemuan } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const updateKasSchema = z.object({
  nominal: z.number().int().min(1).optional(),
  keterangan: z.string().optional(),
  kategori_id: z.string().uuid().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function findTransaksi(grupId: string, id: string) {
  const rows = await db()
    .select()
    .from(transaksi_kas)
    .where(and(eq(transaksi_kas.id, id), eq(transaksi_kas.grup_id, grupId)))
    .limit(1);
  return rows[0] ?? null;
}

async function isPertemuanLocked(pertemuanId: string, grupId: string): Promise<boolean> {
  const rows = await db()
    .select({ terkunci: pertemuan.terkunci })
    .from(pertemuan)
    .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, grupId)))
    .limit(1);
  return rows[0]?.terkunci ?? false;
}

export async function GET(_request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  try {
    const row = await findTransaksi(ctx.grupId, id);
    if (!row) return errorResponse('Transaksi tidak ditemukan', undefined, 404);

    return successResponse(row);
  } catch (err) {
    console.error('[GET /kas/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
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

  const parsed = updateKasSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const row = await findTransaksi(ctx.grupId, id);
    if (!row) return errorResponse('Transaksi tidak ditemukan', undefined, 404);

    if (!row.dapat_diubah) {
      return errorResponse('Transaksi ini tidak dapat diubah', undefined, 400);
    }

    if (row.pertemuan_id) {
      const locked = await isPertemuanLocked(row.pertemuan_id, ctx.grupId);
      if (locked) return errorResponse('Pertemuan terkunci', undefined, 400);
    }

    if (parsed.data.kategori_id) {
      const kat = await db()
        .select({ id: kategori_kas.id })
        .from(kategori_kas)
        .where(
          and(
            eq(kategori_kas.id, parsed.data.kategori_id),
            eq(kategori_kas.grup_id, ctx.grupId),
            eq(kategori_kas.aktif, true)
          )
        )
        .limit(1);

      if (!kat[0]) {
        return errorResponse('Kategori tidak ditemukan', undefined, 400);
      }
    }

    const updated = await db()
      .update(transaksi_kas)
      .set(parsed.data)
      .where(and(eq(transaksi_kas.id, id), eq(transaksi_kas.grup_id, ctx.grupId)))
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'transaksi_kas',
      entitasId: id,
      detail: parsed.data as Record<string, unknown>,
    });

    return successResponse(updated[0], 'Transaksi berhasil diperbarui');
  } catch (err) {
    console.error('[PUT /kas/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  try {
    const row = await findTransaksi(ctx.grupId, id);
    if (!row) return errorResponse('Transaksi tidak ditemukan', undefined, 404);

    if (!row.dapat_diubah) {
      return errorResponse('Transaksi ini tidak dapat dihapus', undefined, 400);
    }

    if (row.pertemuan_id) {
      const locked = await isPertemuanLocked(row.pertemuan_id, ctx.grupId);
      if (locked) return errorResponse('Pertemuan terkunci', undefined, 400);
    }

    await db()
      .delete(transaksi_kas)
      .where(and(eq(transaksi_kas.id, id), eq(transaksi_kas.grup_id, ctx.grupId)));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'DELETE',
      entitas: 'transaksi_kas',
      entitasId: id,
      detail: { nominal: row.nominal, tipe: row.tipe },
    });

    return successResponse(null, 'Transaksi berhasil dihapus');
  } catch (err) {
    console.error('[DELETE /kas/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
