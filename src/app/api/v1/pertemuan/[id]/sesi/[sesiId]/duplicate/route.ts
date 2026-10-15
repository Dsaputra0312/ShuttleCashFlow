import { NextRequest } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, sesi, sesi_pemain, peserta_pertemuan } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string; sesiId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
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

    // Find source sesi
    const sourceSesi = await dbClient
      .select()
      .from(sesi)
      .where(
        and(
          eq(sesi.id, sesiId),
          eq(sesi.pertemuan_id, id),
          eq(sesi.grup_id, ctx.grupId)
        )
      )
      .limit(1);

    if (!sourceSesi[0]) return errorResponse('Sesi tidak ditemukan', undefined, 404);

    const source = sourceSesi[0];

    // Get source pemain_ids
    const sourcePemain = await dbClient
      .select({ pemain_id: sesi_pemain.pemain_id })
      .from(sesi_pemain)
      .where(eq(sesi_pemain.sesi_id, sesiId));

    const pemain_ids = sourcePemain.map((sp) => sp.pemain_id);

    // Create duplicate sesi
    const newSesi = await dbClient
      .insert(sesi)
      .values({
        pertemuan_id: id,
        grup_id: ctx.grupId,
        lapangan: source.lapangan,
        bola_terpakai: source.bola_terpakai,
        ditanggung_oleh_pemain_id: source.ditanggung_oleh_pemain_id,
      })
      .returning();

    const newSesiId = newSesi[0].id;

    // Insert sesi_pemain rows
    if (pemain_ids.length > 0) {
      await dbClient.insert(sesi_pemain).values(
        pemain_ids.map((pemainId) => ({
          sesi_id: newSesiId,
          pemain_id: pemainId,
          grup_id: ctx.grupId,
        }))
      );
    }

    // Upsert peserta_pertemuan for new players
    const existing = await dbClient
      .select({ pemain_id: peserta_pertemuan.pemain_id })
      .from(peserta_pertemuan)
      .where(
        and(
          eq(peserta_pertemuan.pertemuan_id, id),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      );

    const existingSet = new Set(existing.map((e) => e.pemain_id));
    const newPemains = pemain_ids.filter((pid) => !existingSet.has(pid));

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
      aksi: 'DUPLICATE',
      entitas: 'sesi',
      entitasId: newSesiId,
      detail: { source_sesi_id: sesiId },
    });

    return successResponse(
      { ...newSesi[0], pemain_ids },
      'Sesi berhasil diduplikasi',
      201
    );
  } catch (err) {
    console.error('[POST /pertemuan/[id]/sesi/[sesiId]/duplicate]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
