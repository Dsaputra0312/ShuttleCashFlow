// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db';
import { iuran, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { createIuranTransaction } from '@/features/kas/auto-transactions';
import { logActivity } from '@/features/activity-log/log-activity';
import { successResponse, errorResponse } from '@/lib/api-response';

type Params = { params: Promise<{ id: string }> };

const bayarIuranSchema = z.object({
  nominal: z.number().int().min(1).optional(),
});

export async function POST(request: NextRequest, { params }: Params) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = bayarIuranSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('Validasi gagal', undefined, 422);
  }

  try {
    const dbClient = db();

    // Find iuran
    const iuranRows = await dbClient
      .select()
      .from(iuran)
      .where(and(eq(iuran.id, id), eq(iuran.grup_id, ctx.grupId)))
      .limit(1);

    if (!iuranRows[0]) {
      return errorResponse('Data iuran tidak ditemukan', undefined, 404);
    }

    const currentIuran = iuranRows[0];

    if (currentIuran.status === 'lunas') {
      return errorResponse('Iuran ini sudah berstatus lunas', undefined, 400);
    }

    const finalNominal = parsed.data.nominal ?? currentIuran.nominal;
    if (finalNominal <= 0) {
      return errorResponse('Nominal pelunasan iuran harus lebih dari 0', undefined, 422);
    }

    // Find pemain name
    const pemainRows = await dbClient
      .select({ nama: pemain.nama })
      .from(pemain)
      .where(and(eq(pemain.id, currentIuran.pemain_id), eq(pemain.grup_id, ctx.grupId)))
      .limit(1);

    const now = new Date();

    // Update iuran to lunas
    const updatedRows = await dbClient
      .update(iuran)
      .set({
        status: 'lunas',
        nominal: finalNominal,
        dibayar_pada: now,
      })
      .where(and(eq(iuran.id, id), eq(iuran.grup_id, ctx.grupId)))
      .returning();

    // Create kas transaction
    await createIuranTransaction(dbClient, {
      grupId: ctx.grupId,
      pemainId: currentIuran.pemain_id,
      pemainNama: pemainRows[0]?.nama,
      adminId: ctx.adminId,
      iuranId: id,
      nominal: finalNominal,
    });

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'UPDATE',
      entitas: 'iuran',
      entitasId: id,
      alasan: 'Pelunasan iuran (bayar nanti -> lunas)',
      detail: {
        sebelum: currentIuran.status,
        sesudah: 'lunas',
        nominal: finalNominal,
      },
    });

    return successResponse(updatedRows[0], 'Iuran berhasil dilunasi dan dicatat ke kas');
  } catch (err) {
    console.error('[POST /iuran/[id]/bayar]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
