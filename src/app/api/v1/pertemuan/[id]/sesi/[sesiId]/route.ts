import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, sesi, sesi_pemain, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const updateSesiSchema = z.object({
  lapangan: z.number().int().min(1).max(2).optional(),
  bola_terpakai: z.number().int().min(1).optional(),
  pemain_ids: z.array(z.string().uuid()).min(1).optional(),
  ditanggung_oleh_pemain_id: z.string().uuid().nullable().optional(),
});

type Params = { params: Promise<{ id: string; sesiId: string }> };

async function findSesi(grupId: string, pertemuanId: string, sesiId: string) {
  const rows = await db()
    .select()
    .from(sesi)
    .where(
      and(
        eq(sesi.id, sesiId),
        eq(sesi.pertemuan_id, pertemuanId),
        eq(sesi.grup_id, grupId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function PUT(request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id, sesiId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = updateSesiSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const dbClient = db();

    // Check pertemuan locked
    const pt = await dbClient
      .select({ terkunci: pertemuan.terkunci })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, id), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!pt[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    if (pt[0].terkunci) return errorResponse('Pertemuan terkunci', undefined, 400);

    const existing = await findSesi(ctx.grupId, id, sesiId);
    if (!existing) return errorResponse('Sesi tidak ditemukan', undefined, 404);

    const { pemain_ids, ditanggung_oleh_pemain_id, ...sesiFields } = parsed.data;

    // Update sesi fields
    const updated = await dbClient
      .update(sesi)
      .set(sesiFields)
      .where(and(eq(sesi.id, sesiId), eq(sesi.grup_id, ctx.grupId)))
      .returning();

    let finalPemainIds: string[] | undefined;

    if (pemain_ids) {
      if (new Set(pemain_ids).size !== pemain_ids.length) {
        return errorResponse('Pemain tidak boleh duplikat', undefined, 400);
      }

      // Validate pemain exist in grup
      const pemainRows = await dbClient
        .select({ id: pemain.id })
        .from(pemain)
        .where(and(eq(pemain.grup_id, ctx.grupId), inArray(pemain.id, pemain_ids)));

      if (pemainRows.length !== pemain_ids.length) {
        return errorResponse('Satu atau lebih pemain tidak ditemukan', undefined, 400);
      }

      // Replace sesi_pemain
      await dbClient.delete(sesi_pemain).where(eq(sesi_pemain.sesi_id, sesiId));
      await dbClient.insert(sesi_pemain).values(
        pemain_ids.map((pemainId) => ({
          sesi_id: sesiId,
          pemain_id: pemainId,
          grup_id: ctx.grupId,
        }))
      );
      finalPemainIds = pemain_ids;
    }

    if (ditanggung_oleh_pemain_id !== undefined) {
      await dbClient
        .update(sesi)
        .set({ ditanggung_oleh_pemain_id })
        .where(and(eq(sesi.id, sesiId), eq(sesi.grup_id, ctx.grupId)));
    }

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'sesi',
      entitasId: sesiId,
      detail: parsed.data as Record<string, unknown>,
    });

    return successResponse({ ...updated[0], pemain_ids: finalPemainIds });
  } catch (err) {
    console.error('[PUT /pertemuan/[id]/sesi/[sesiId]]', err);
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

  const { id, sesiId } = await params;

  try {
    const dbClient = db();

    const pt = await dbClient
      .select({ terkunci: pertemuan.terkunci })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, id), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!pt[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    if (pt[0].terkunci) return errorResponse('Pertemuan terkunci', undefined, 400);

    const existing = await findSesi(ctx.grupId, id, sesiId);
    if (!existing) return errorResponse('Sesi tidak ditemukan', undefined, 404);

    // Delete sesi_pemain first (cascade won't handle this in all cases)
    await dbClient.delete(sesi_pemain).where(eq(sesi_pemain.sesi_id, sesiId));
    await dbClient
      .delete(sesi)
      .where(and(eq(sesi.id, sesiId), eq(sesi.grup_id, ctx.grupId)));

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'DELETE',
      entitas: 'sesi',
      entitasId: sesiId,
    });

    return successResponse(null, 'Sesi berhasil dihapus');
  } catch (err) {
    console.error('[DELETE /pertemuan/[id]/sesi/[sesiId]]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
