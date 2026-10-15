import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const updatePemainSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').optional(),
  no_hp: z.string().optional().nullable(),
  catatan: z.string().optional().nullable(),
  bebas_biaya: z.boolean().optional(),
});

async function findPemain(grupId: string, id: string) {
  const rows = await db()
    .select()
    .from(pemain)
    .where(and(eq(pemain.id, id), eq(pemain.grup_id, grupId)))
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
    const row = await findPemain(ctx.grupId, id);
    if (!row) return errorResponse('Pemain tidak ditemukan', undefined, 404);
    return successResponse(row);
  } catch (err) {
    console.error('[GET /pemain/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
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

  const parsed = updatePemainSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const existing = await findPemain(ctx.grupId, id);
    if (!existing) return errorResponse('Pemain tidak ditemukan', undefined, 404);

    const rows = await db()
      .update(pemain)
      .set({ ...parsed.data, diperbarui_pada: new Date() })
      .where(and(eq(pemain.id, id), eq(pemain.grup_id, ctx.grupId)))
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'pemain',
      entitasId: id,
      detail: parsed.data as Record<string, unknown>,
    });

    return successResponse(rows[0], 'Pemain berhasil diperbarui');
  } catch (err) {
    console.error('[PUT /pemain/[id]]', err);
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
    const existing = await findPemain(ctx.grupId, id);
    if (!existing) return errorResponse('Pemain tidak ditemukan', undefined, 404);

    const rows = await db()
      .update(pemain)
      .set({ aktif: false, diperbarui_pada: new Date() })
      .where(and(eq(pemain.id, id), eq(pemain.grup_id, ctx.grupId)))
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'DEACTIVATE',
      entitas: 'pemain',
      entitasId: id,
      detail: { nama: existing.nama },
    });

    return successResponse(rows[0], 'Pemain berhasil dinonaktifkan');
  } catch (err) {
    console.error('[DELETE /pemain/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
