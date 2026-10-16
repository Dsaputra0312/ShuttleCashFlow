// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, peserta_pertemuan, sesi, sesi_pemain, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { createTagihanTransaction } from '@/features/kas/auto-transactions';
import { successResponse, errorResponse } from '@/lib/api-response';

const bayarSchema = z.object({
  jumlah: z.number().int().min(0, 'Jumlah tidak boleh negatif'),
  metode: z.string().min(1, 'Metode bayar wajib diisi'),
});

type Params = { params: Promise<{ id: string; pesertaId: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id: pertemuanId, pesertaId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = bayarSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  const { jumlah, metode } = parsed.data;

  try {
    const dbClient = db();

    // Load pertemuan
    const ptRows = await dbClient
      .select({ terkunci: pertemuan.terkunci })
      .from(pertemuan)
      .where(and(eq(pertemuan.id, pertemuanId), eq(pertemuan.grup_id, ctx.grupId)))
      .limit(1);

    if (!ptRows[0]) return errorResponse('Pertemuan tidak ditemukan', undefined, 404);
    if (ptRows[0].terkunci) return errorResponse('Pertemuan terkunci', undefined, 400);

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

    if (peserta.status_main === 'lunas') {
      return errorResponse('Peserta sudah berstatus lunas', undefined, 400);
    }

    if (peserta.status_main === 'bermain') {
      // Check if player has any active draft sessions (bola_terpakai === 0)
      const sesiRows = await dbClient
        .select()
        .from(sesi)
        .where(and(eq(sesi.pertemuan_id, pertemuanId), eq(sesi.grup_id, ctx.grupId)));

      const sesiIds = sesiRows.map((s) => s.id);
      const sesiPemainRows = sesiIds.length
        ? await dbClient
            .select()
            .from(sesi_pemain)
            .where(inArray(sesi_pemain.sesi_id, sesiIds))
        : [];

      for (const s of sesiRows) {
        if (s.bola_terpakai === 0) {
          const pids = sesiPemainRows
            .filter((sp) => sp.sesi_id === s.id)
            .map((sp) => sp.pemain_id);
          if (pids.includes(peserta.pemain_id)) {
            return errorResponse(
              `Pemain masih memiliki sesi main aktif di Lapangan ${s.lapangan}. Harap selesaikan sesi terlebih dahulu sebelum bayar.`,
              undefined,
              400
            );
          }
        }
      }
    }

    // Validate payment amount
    if (peserta.tagihan > 0 && jumlah < peserta.tagihan) {
      return errorResponse(
        `Jumlah bayar (${jumlah}) kurang dari tagihan (${peserta.tagihan})`,
        undefined,
        400
      );
    }

    const pemainRows = await dbClient
      .select({ nama: pemain.nama })
      .from(pemain)
      .where(and(eq(pemain.id, peserta.pemain_id), eq(pemain.grup_id, ctx.grupId)))
      .limit(1);

    // Create auto-transactions (kas records)
    await createTagihanTransaction(dbClient, {
      grupId: ctx.grupId,
      pertemuanId,
      pesertaId,
      pemainId: peserta.pemain_id,
      pemainNama: pemainRows[0]?.nama,
      adminId: ctx.adminId,
      tagihan: peserta.tagihan,
      dibayar: jumlah,
    });

    // Update peserta status
    const updated = await dbClient
      .update(peserta_pertemuan)
      .set({
        status_main: 'lunas',
        dibayar: jumlah,
        metode_bayar: metode,
        selesai_pada: peserta.selesai_pada ?? new Date(),
      })
      .where(
        and(
          eq(peserta_pertemuan.id, pesertaId),
          eq(peserta_pertemuan.grup_id, ctx.grupId)
        )
      )
      .returning();

    return successResponse(updated[0], 'Pembayaran berhasil dicatat');
  } catch (err) {
    console.error('[POST /pertemuan/[id]/peserta/[pesertaId]/bayar]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
