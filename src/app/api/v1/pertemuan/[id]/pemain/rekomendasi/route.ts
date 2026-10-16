// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and, asc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, sesi, sesi_pemain, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { successResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId } = await params;

  try {
    const dbClient = db();

    // Verify pertemuan belongs to grup
    const ptRows = await dbClient
      .select({ id: pertemuan.id })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);

    // Get all active players in the group
    const allPemain = await dbClient
      .select({ id: pemain.id, nama: pemain.nama })
      .from(pemain)
      .where(and(eq(pemain.grup_id, ctx.grupId), eq(pemain.aktif, true)))
      .orderBy(asc(pemain.nama));

    // Get all sessions for this meeting
    const sesiRows = await dbClient
      .select({ id: sesi.id })
      .from(sesi)
      .where(and(eq(sesi.pertemuan_id, pertemuanId), eq(sesi.grup_id, ctx.grupId)));

    const sesiIds = sesiRows.map((s) => s.id);

    // Count sessions played in this meeting per player
    const playCountMap = new Map<string, number>();
    if (sesiIds.length > 0) {
      const spRows = await dbClient
        .select({ pemain_id: sesi_pemain.pemain_id })
        .from(sesi_pemain)
        .where(inArray(sesi_pemain.sesi_id, sesiIds));

      for (const row of spRows) {
        playCountMap.set(row.pemain_id, (playCountMap.get(row.pemain_id) ?? 0) + 1);
      }
    }

    const pemainWithCount = allPemain.map((p) => ({
      ...p,
      sesi_count: playCountMap.get(p.id) ?? 0,
    }));

    // Sort by session count ascending (fewest first), then by name
    const sortedRekomendasi = [...pemainWithCount].sort((a, b) => {
      if (a.sesi_count !== b.sesi_count) {
        return a.sesi_count - b.sesi_count;
      }
      return a.nama.localeCompare(b.nama);
    });

    const belumMain = pemainWithCount.filter((p) => p.sesi_count === 0);
    const sudahMain = pemainWithCount
      .filter((p) => p.sesi_count > 0)
      .sort((a, b) => a.sesi_count - b.sesi_count);

    return successResponse({
      rekomendasi: sortedRekomendasi.slice(0, 8),
      belum_main: belumMain,
      sudah_main: sudahMain,
      all_pemain: pemainWithCount,
    });
  } catch (err) {
    console.error('[GET /pertemuan/[id]/pemain/rekomendasi]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
