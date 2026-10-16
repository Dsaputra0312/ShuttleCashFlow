// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, sesi, sesi_pemain, peserta_pertemuan, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

const createSesiSchema = z.object({
  lapangan: z.number().int().min(1).max(999),
  bola_terpakai: z.number().int().min(0, 'Bola terpakai minimal 0'),
  pemain_ids: z
    .array(z.string().uuid())
    .min(1, 'Minimal 1 pemain')
    .max(4, 'Maksimal 4 pemain dalam 1 sesi'),
  ditanggung_oleh_pemain_id: z.string().uuid().nullable().optional(),
});

async function getPertemuan(grupId: string, pertemuanId: string) {
  const rows = await db()
    .select()
    .from(pertemuan)
    .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, grupId)))
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
    const pt = await getPertemuan(ctx.grupId, id);
    if (!pt) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    const sesiRows = await db()
      .select()
      .from(sesi)
      .where(and(eq(sesi.pertemuan_id, id), eq(sesi.grup_id, ctx.grupId)));

    // Get players for each session
    const sesiIds = sesiRows.map((s) => s.id);
    const sesiPemainRows = sesiIds.length
      ? await db()
          .select()
          .from(sesi_pemain)
          .where(inArray(sesi_pemain.sesi_id, sesiIds))
      : [];

    const result = sesiRows.map((s) => ({
      ...s,
      pemain_ids: sesiPemainRows
        .filter((sp) => sp.sesi_id === s.id)
        .map((sp) => sp.pemain_id),
    }));

    return successResponse(result);
  } catch (err) {
    console.error('[GET /pertemuan/[id]/sesi]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

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

  const parsed = createSesiSchema.safeParse(body);
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

    const pt = await getPertemuan(ctx.grupId, id);
    if (!pt) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    if (pt.terkunci) {
      return errorResponse('Pertemuan terkunci', undefined, 400);
    }

    const { lapangan, bola_terpakai, pemain_ids, ditanggung_oleh_pemain_id } = parsed.data;

    // Check no duplicates in pemain_ids
    if (new Set(pemain_ids).size !== pemain_ids.length) {
      return errorResponse('Pemain tidak boleh duplikat dalam satu sesi', undefined, 400);
    }

    // Check bearer is in pemain_ids
    if (
      ditanggung_oleh_pemain_id &&
      !pemain_ids.includes(ditanggung_oleh_pemain_id)
    ) {
      return errorResponse(
        'Pemain yang menanggung harus berada dalam sesi',
        undefined,
        400
      );
    }

    // Validate all pemain exist in grup
    const pemainRows = await dbClient
      .select({ id: pemain.id })
      .from(pemain)
      .where(and(eq(pemain.grup_id, ctx.grupId), inArray(pemain.id, pemain_ids)));

    if (pemainRows.length !== pemain_ids.length) {
      return errorResponse(
        'Satu atau lebih pemain tidak ditemukan dalam grup',
        undefined,
        400
      );
    }

    // Insert sesi
    const newSesi = await dbClient
      .insert(sesi)
      .values({
        pertemuan_id: id,
        grup_id: ctx.grupId,
        lapangan,
        bola_terpakai,
        ditanggung_oleh_pemain_id: ditanggung_oleh_pemain_id ?? null,
      })
      .returning();

    const sesiId = newSesi[0].id;

    // Insert sesi_pemain rows
    await dbClient.insert(sesi_pemain).values(
      pemain_ids.map((pemainId) => ({
        sesi_id: sesiId,
        pemain_id: pemainId,
        grup_id: ctx.grupId,
      }))
    );

    // Upsert peserta_pertemuan for each new player (those not already in this pertemuan)
    const existing = await dbClient
      .select({ pemain_id: peserta_pertemuan.pemain_id })
      .from(peserta_pertemuan)
      .where(
        and(
          eq(peserta_pertemuan.pertemuan_id, id),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      );

    const existingPemainIds = new Set(existing.map((e) => e.pemain_id));
    const newPemains = pemain_ids.filter((pid) => !existingPemainIds.has(pid));

    if (newPemains.length > 0) {
      await dbClient.insert(peserta_pertemuan).values(
        newPemains.map((pemainId) => ({
          pertemuan_id: id,
          pemain_id: pemainId,
          grup_id: ctx.grupId,
          status_main: 'bermain' as const,
        }))
      );
    }

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'sesi',
      entitasId: sesiId,
      detail: { lapangan, bola_terpakai, pemain_count: pemain_ids.length },
    });

    return successResponse(
      { ...newSesi[0], pemain_ids },
      'Sesi berhasil ditambahkan',
      201
    );
  } catch (err) {
    console.error('[POST /pertemuan/[id]/sesi]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
