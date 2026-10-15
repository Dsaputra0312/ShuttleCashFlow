import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, count } from 'drizzle-orm';
import { db } from '@/db';
import { admin } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const updateAdminSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi').optional(),
  email: z.string().email('Email tidak valid').optional(),
});

async function findAdmin(grupId: string, id: string) {
  const rows = await db()
    .select({
      id: admin.id,
      nama: admin.nama,
      email: admin.email,
      aktif: admin.aktif,
      dibuat_pada: admin.dibuat_pada,
      grup_id: admin.grup_id,
    })
    .from(admin)
    .where(and(eq(admin.id, id), eq(admin.grup_id, grupId)))
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

  const parsed = updateAdminSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const existing = await findAdmin(ctx.grupId, id);
    if (!existing) return errorResponse('Admin tidak ditemukan', undefined, 404);

    const rows = await db()
      .update(admin)
      .set(parsed.data)
      .where(and(eq(admin.id, id), eq(admin.grup_id, ctx.grupId)))
      .returning({
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
        aktif: admin.aktif,
        dibuat_pada: admin.dibuat_pada,
        grup_id: admin.grup_id,
      });

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'admin',
      entitasId: id,
      detail: parsed.data as Record<string, unknown>,
    });

    return successResponse(rows[0], 'Admin berhasil diperbarui');
  } catch (err) {
    console.error('[PUT /admin/[id]]', err);
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
    const existing = await findAdmin(ctx.grupId, id);
    if (!existing) return errorResponse('Admin tidak ditemukan', undefined, 404);

    // Guard: cannot deactivate last active admin
    const activeCountRows = await db()
      .select({ count: count() })
      .from(admin)
      .where(and(eq(admin.grup_id, ctx.grupId), eq(admin.aktif, true)));

    const activeCount = activeCountRows[0]?.count ?? 0;
    if (activeCount <= 1) {
      return errorResponse(
        'Tidak dapat menonaktifkan admin terakhir yang aktif',
        undefined,
        400
      );
    }

    const rows = await db()
      .update(admin)
      .set({ aktif: false })
      .where(and(eq(admin.id, id), eq(admin.grup_id, ctx.grupId)))
      .returning({
        id: admin.id,
        nama: admin.nama,
        email: admin.email,
        aktif: admin.aktif,
        dibuat_pada: admin.dibuat_pada,
        grup_id: admin.grup_id,
      });

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'DEACTIVATE',
      entitas: 'admin',
      entitasId: id,
      detail: { nama: existing.nama },
    });

    return successResponse(rows[0], 'Admin berhasil dinonaktifkan');
  } catch (err) {
    console.error('[DELETE /admin/[id]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
