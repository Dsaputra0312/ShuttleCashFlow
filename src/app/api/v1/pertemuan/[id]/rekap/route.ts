import { NextRequest } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, sesi, sesi_pemain, peserta_pertemuan, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { generateRekapWhatsApp } from '@/features/whatsapp/recap-generator';
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

    // Load pertemuan
    const ptRows = await dbClient
      .select()
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    const pt = ptRows[0];

    // Load all sesi for this pertemuan
    const sesiRows = await dbClient
      .select()
      .from(sesi)
      .where(and(eq(sesi.pertemuan_id, pertemuanId), eq(sesi.grup_id, ctx.grupId)));

    // Load sesi_pemain for all sessions
    const sesiIds = sesiRows.map((s) => s.id);
    const sesiPemainRows = sesiIds.length
      ? await dbClient
          .select()
          .from(sesi_pemain)
          .where(inArray(sesi_pemain.sesi_id, sesiIds))
      : [];

    // Load all peserta for this pertemuan
    const pesertaRows = await dbClient
      .select()
      .from(peserta_pertemuan)
      .where(
        and(
          eq(peserta_pertemuan.pertemuan_id, pertemuanId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      );

    // Load player names
    const pemainIds = pesertaRows.map((p) => p.pemain_id);
    const pemainRows = pemainIds.length
      ? await dbClient
          .select({ id: pemain.id, nama: pemain.nama })
          .from(pemain)
          .where(inArray(pemain.id, pemainIds))
      : [];

    const pemainNamaMap = new Map(pemainRows.map((p) => [p.id, p.nama]));

    // Build sesi data with pemain_ids
    const sesiData = sesiRows.map((s) => ({
      id: s.id,
      lapangan: s.lapangan,
      bola_terpakai: s.bola_terpakai,
      ditanggung_oleh_pemain_id: s.ditanggung_oleh_pemain_id,
      pemain_ids: sesiPemainRows
        .filter((sp) => sp.sesi_id === s.id)
        .map((sp) => sp.pemain_id),
    }));

    // Build peserta data
    const pesertaData = pesertaRows.map((p) => ({
      pemain_id: p.pemain_id,
      nama: pemainNamaMap.get(p.pemain_id) ?? p.pemain_id,
      tagihan: p.tagihan,
      dibayar: p.dibayar,
      status_main: p.status_main,
    }));

    const teks = generateRekapWhatsApp(
      { id: pt.id, tanggal: pt.tanggal, terkunci: pt.terkunci },
      sesiData,
      pesertaData
    );

    return successResponse({ teks }, 'OK');
  } catch (err) {
    console.error('[GET /pertemuan/[id]/rekap]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
