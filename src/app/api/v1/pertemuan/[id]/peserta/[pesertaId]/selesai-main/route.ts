import { NextRequest } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  pertemuan,
  sesi,
  sesi_pemain,
  peserta_pertemuan,
  pemain,
  iuran,
} from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { hitungTagihan } from '@/features/billing/calculator';
import { successResponse, errorResponse } from '@/lib/api-response';
import type { KonfigurasiInput, SesiInput, PemainInput } from '@/features/billing/types';

type Params = { params: Promise<{ id: string; pesertaId: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId, pesertaId } = await params;

  try {
    const dbClient = db();

    // Load pertemuan
    const ptRows = await dbClient
      .select()
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    const pt = ptRows[0];

    if (pt.terkunci) return errorResponse('Pertemuan terkunci', undefined, 400);

    // Load peserta
    const pesertaRows = await dbClient
      .select()
      .from(peserta_pertemuan)
      .where(
        and(
          eq(peserta_pertemuan.id, pesertaId),
          eq(peserta_pertemuan.pertemuan_id, pertemuanId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      )
      .limit(1);

    if (!pesertaRows[0]) return errorResponse('Peserta tidak ditemukan', undefined, 404);
    const peserta = pesertaRows[0];

    if (peserta.status_main !== 'bermain') {
      return errorResponse('Peserta tidak dalam status bermain', undefined, 400);
    }

    // Load all sesi in this pertemuan
    const sesiRows = await dbClient
      .select()
      .from(sesi)
      .where(and(eq(sesi.pertemuan_id, pertemuanId), eq(sesi.grup_id, ctx.grupId)));

    const sesiIds = sesiRows.map((s) => s.id);

    // Load all sesi_pemain for this pertemuan
    const sesiPemainRows = sesiIds.length
      ? await dbClient
          .select()
          .from(sesi_pemain)
          .where(inArray(sesi_pemain.sesi_id, sesiIds))
      : [];

    // Get all unique pemain_ids in this pertemuan
    const allPemainIds = [
      ...new Set(sesiPemainRows.map((sp) => sp.pemain_id)),
    ];

    // Load pemain data
    const pemainRows = allPemainIds.length
      ? await dbClient
          .select({ id: pemain.id, bebas_biaya: pemain.bebas_biaya })
          .from(pemain)
          .where(
            and(eq(pemain.grup_id, ctx.grupId), inArray(pemain.id, allPemainIds))
          )
      : [];

    // Determine member status: check iuran for current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const iuranRows = allPemainIds.length
      ? await dbClient
          .select({ pemain_id: iuran.pemain_id })
          .from(iuran)
          .where(
            and(
              eq(iuran.grup_id, ctx.grupId),
              eq(iuran.periode_tahun, currentYear),
              eq(iuran.periode_bulan, currentMonth),
              inArray(iuran.pemain_id, allPemainIds)
            )
          )
      : [];

    const memberSet = new Set(iuranRows.map((i) => i.pemain_id));

    // Build inputs for calculator
    const pemainInputs: PemainInput[] = pemainRows.map((p) => ({
      id: p.id,
      bebas_biaya: p.bebas_biaya,
      is_member: memberSet.has(p.id),
    }));

    const sesiInputs: SesiInput[] = sesiRows.map((s) => ({
      id: s.id,
      lapangan: s.lapangan,
      bola_terpakai: s.bola_terpakai,
      ditanggung_oleh_pemain_id: s.ditanggung_oleh_pemain_id ?? null,
      pemain_ids: sesiPemainRows
        .filter((sp) => sp.sesi_id === s.id)
        .map((sp) => sp.pemain_id),
    }));

    const snapshot = pt.konfigurasi_snapshot as Record<string, number>;
    const config: KonfigurasiInput = {
      harga_bola_per_biji: snapshot.harga_bola_per_biji,
      biaya_lapangan_non_member: snapshot.biaya_lapangan_non_member,
      kelipatan_pembulatan: snapshot.kelipatan_pembulatan,
    };

    const hasil = hitungTagihan(sesiInputs, pemainInputs, config);

    // Find this peserta's billing breakdown
    const tagihanPemain = hasil.tagihan_per_pemain.find(
      (t) => t.pemain_id === peserta.pemain_id
    );

    const tagihan = tagihanPemain?.tagihan ?? 0;

    // Update peserta status
    await dbClient
      .update(peserta_pertemuan)
      .set({
        status_main: 'selesai',
        tagihan,
        selesai_pada: new Date(),
      })
      .where(
        and(
          eq(peserta_pertemuan.id, pesertaId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      );

    return successResponse({
      peserta_id: pesertaId,
      pemain_id: peserta.pemain_id,
      tagihan,
      breakdown: {
        biaya_bola: tagihanPemain?.biaya_bola_raw ?? 0,
        biaya_lapangan: tagihanPemain?.biaya_lapangan_raw ?? 0,
        pembulatan: tagihan - ((tagihanPemain?.biaya_bola_raw ?? 0) + (tagihanPemain?.biaya_lapangan_raw ?? 0)),
        tagihan_total: tagihan,
      },
    });
  } catch (err) {
    console.error('[POST /pertemuan/[id]/peserta/[pesertaId]/selesai-main]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
