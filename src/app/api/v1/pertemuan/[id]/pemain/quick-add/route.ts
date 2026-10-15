import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const quickAddSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
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

  const parsed = quickAddSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  const { nama } = parsed.data;

  try {
    const dbClient = db();

    // Verify pertemuan belongs to grup
    const ptRows = await dbClient
      .select({ id: pertemuan.id })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    // Try to find existing pemain by name (case-insensitive)
    const existing = await dbClient
      .select()
      .from(pemain)
      .where(
        and(
          eq(pemain.grup_id, ctx.grupId),
          sql`LOWER(${pemain.nama}) = LOWER(${nama})`
        )
      )
      .limit(1);

    if (existing[0]) {
      return successResponse(existing[0]);
    }

    // Create new pemain
    const rows = await dbClient
      .insert(pemain)
      .values({
        grup_id: ctx.grupId,
        nama,
      })
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'QUICK_ADD',
      entitas: 'pemain',
      entitasId: rows[0].id,
      detail: { nama },
    });

    return successResponse(rows[0], 'Pemain berhasil ditambahkan', 201);
  } catch (err) {
    console.error('[POST /pertemuan/[id]/pemain/quick-add]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
