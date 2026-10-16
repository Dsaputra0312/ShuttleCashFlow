// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, sesi, sesi_pemain, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { successResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId } = await params;
  const n = parseInt(request.nextUrl.searchParams.get('n') ?? '12', 10);

  try {
    const dbClient = db();

    // Verify pertemuan belongs to grup
    const ptRows = await dbClient
      .select({ id: pertemuan.id })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    // Get recent sesi for this pertemuan (to prioritize players in this meeting)
    const sesiRows = await dbClient
      .select({ id: sesi.id })
      .from(sesi)
      .where(and(eq(sesi.pertemuan_id, pertemuanId), eq(sesi.grup_id, ctx.grupId)));

    const sesiIds = sesiRows.map((s) => s.id);

    // Get players from this pertemuan's sessions first
    const currentPemainIds: string[] = [];
    if (sesiIds.length > 0) {
      const spRows = await dbClient
        .select({ pemain_id: sesi_pemain.pemain_id })
        .from(sesi_pemain)
        .where(inArray(sesi_pemain.sesi_id, sesiIds));
      const seen = new Set<string>();
      for (const row of spRows) {
        if (!seen.has(row.pemain_id)) {
          seen.add(row.pemain_id);
          currentPemainIds.push(row.pemain_id);
        }
      }
    }

    // Get recent sesi across all meetings in this grup (for quick-select)
    const recentSesi = await dbClient
      .select({ id: sesi.id })
      .from(sesi)
      .where(eq(sesi.grup_id, ctx.grupId))
      .orderBy(desc(sesi.dibuat_pada))
      .limit(50);

    const recentSesiIds = recentSesi.map((s) => s.id);

    const recentPemainRows = recentSesiIds.length
      ? await dbClient
          .select({ pemain_id: sesi_pemain.pemain_id })
          .from(sesi_pemain)
          .where(inArray(sesi_pemain.sesi_id, recentSesiIds))
      : [];

    // Merge: current meeting players first, then recent
    const seen = new Set<string>(currentPemainIds);
    const allIds = [...currentPemainIds];
    for (const row of recentPemainRows) {
      if (!seen.has(row.pemain_id)) {
        seen.add(row.pemain_id);
        allIds.push(row.pemain_id);
      }
    }

    const topIds = allIds.slice(0, n);

    if (topIds.length === 0) {
      return successResponse([]);
    }

    // Load pemain details
    const pemainRows = await dbClient
      .select({ id: pemain.id, nama: pemain.nama })
      .from(pemain)
      .where(
        and(
          inArray(pemain.id, topIds),
          eq(pemain.grup_id, ctx.grupId),
          eq(pemain.aktif, true)
        )
      );

    // Sort in the same order as topIds
    const pemainById = new Map(pemainRows.map((p) => [p.id, p]));
    const result = topIds
      .map((id) => pemainById.get(id))
      .filter(Boolean);

    return successResponse(result);
  } catch (err) {
    console.error('[GET /pertemuan/[id]/pemain/last-played]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
