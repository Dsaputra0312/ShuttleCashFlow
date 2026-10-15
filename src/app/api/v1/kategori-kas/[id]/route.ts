import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { kategori_kas } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const updateKategoriSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').optional(),
  tipe: z
    .enum(['pemasukan', 'pengeluaran'], {
      error: 'Tipe harus pemasukan atau pengeluaran',
    })
    .optional(),
});

async function findKategori(grupId: string, id: string) {
  const rows = await db()
    .select()
    .from(kategori_kas)
    .where(and(eq(kategori_kas.id, id), eq(kategori_kas.grup_id, grupId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function PUT(
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

  const parsed = updateKategoriSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const existing = await findKategori(ctx.grupId, id);
    if (!existing) return errorResponse('Kategori tidak ditemukan', undefined, 404);

    if (existing.adalah_sistem) {
      return errorResponse('Kategori sistem tidak dapat diubah', undefined, 400);
    }

    const rows = await db()
      .update(kategori_kas)
      .set(parsed.data)
      .where(and(eq(kategori_kas.id, id), eq(kategori_kas.grup_id, ctx.grupId)))
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'kategori_kas',
      entitasId: id,
      detail: parsed.data as Record<string, unknown>,
    });

    return successResponse(rows[0], 'Kategori berhasil diperbarui');
  } catch (err) {
    console.error('[PUT /kategori-kas/[id]]', err);
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
    const existing = await findKategori(ctx.grupId, id);
    if (!existing) return errorResponse('Kategori tidak ditemukan', undefined, 404);

    // System categories cannot be deleted
    if (existing.adalah_sistem) {
      return errorResponse('Kategori sistem tidak dapat dihapus', undefined, 400);
    }

    const rows = await db()
      .update(kategori_kas)
      .set({ aktif: false })
      .where(and(eq(kategori_kas.id, id), eq(kategori_kas.grup_id, ctx.grupId)))
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'DEACTIVATE',
      entitas: 'kategori_kas',
      entitasId: id,
      detail: { nama: existing.nama },
    });

    return successResponse(rows[0], 'Kategori berhasil dinonaktifkan');
  } catch (err) {
    console.error('[DELETE /kategori-kas/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
