// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, count, desc } from 'drizzle-orm';
import { db } from '@/db';
import { iuran, konfigurasi_grup, pemain } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { createIuranTransaction } from '@/features/kas/auto-transactions';
import { logActivity } from '@/features/activity-log/log-activity';
import { parseListQuery } from '@/lib/query-helpers';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';

const createIuranSchema = z.object({
  pemain_id: z.string().uuid('pemain_id tidak valid'),
  periode_tahun: z.number().int().min(2020).max(2100),
  periode_bulan: z.number().int().min(1).max(12),
  nominal: z.number().int().min(0).optional(),
  status: z.enum(['lunas', 'bayar_nanti', 'gratis']).default('lunas'),
});

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const parsed = parseListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;

  const { page, per_page } = parsed.query;
  const offset = (page - 1) * per_page;

  const pemainId = request.nextUrl.searchParams.get('pemain_id');

  try {
    const dbClient = db();
    const conditions = [eq(iuran.grup_id, ctx.grupId)];
    if (pemainId) conditions.push(eq(iuran.pemain_id, pemainId));

    const condition = and(...conditions);

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(iuran).where(condition),
      dbClient
        .select()
        .from(iuran)
        .where(condition)
        .orderBy(desc(iuran.dibuat_pada))
        .limit(per_page)
        .offset(offset),
    ]);

    const total = totalRows[0]?.count ?? 0;
    return paginatedResponse(rows, {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
    });
  } catch (err) {
    console.error('[GET /iuran]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Request body tidak valid', undefined, 400);
  }

  const parsed = createIuranSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  const { pemain_id, periode_tahun, periode_bulan, status } = parsed.data;

  try {
    const dbClient = db();

    // Validate pemain exists in grup
    const pemainRows = await dbClient
      .select({ id: pemain.id, nama: pemain.nama })
      .from(pemain)
      .where(and(eq(pemain.id, pemain_id), eq(pemain.grup_id, ctx.grupId)))
      .limit(1);

    if (!pemainRows[0]) return errorResponse('Pemain tidak ditemukan', undefined, 404);

    // Load config for default iuran_bulanan
    const konfigs = await dbClient
      .select({ iuran_bulanan: konfigurasi_grup.iuran_bulanan })
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    const defaultIuran = konfigs[0]?.iuran_bulanan ?? 50000;
    let finalNominal = parsed.data.nominal ?? defaultIuran;

    if (status === 'gratis') {
      finalNominal = 0;
    } else if (status === 'lunas') {
      if (finalNominal < defaultIuran) {
        return errorResponse(
          `Nominal iuran minimal Rp ${defaultIuran}`,
          { nominal: [`Minimal Rp ${defaultIuran}`] },
          422
        );
      }
    } else if (status === 'bayar_nanti') {
      if (finalNominal <= 0) {
        finalNominal = defaultIuran;
      }
    }

    // Insert iuran (unique constraint will fail if duplicate for same month)
    let newIuran;
    try {
      const rows = await dbClient
        .insert(iuran)
        .values({
          grup_id: ctx.grupId,
          pemain_id,
          periode_tahun,
          periode_bulan,
          nominal: finalNominal,
          status,
          dibayar_pada: status === 'lunas' ? new Date() : null,
        })
        .returning();
      newIuran = rows[0];
    } catch {
      return errorResponse(
        'Iuran untuk periode ini sudah ada',
        undefined,
        409
      );
    }

    // Only create kas transaction if paid now (lunas)
    if (status === 'lunas') {
      await createIuranTransaction(dbClient, {
        grupId: ctx.grupId,
        pemainId: pemain_id,
        pemainNama: pemainRows[0].nama,
        adminId: ctx.adminId,
        iuranId: newIuran.id,
        nominal: finalNominal,
      });
    }

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'iuran',
      entitasId: newIuran.id,
      detail: { pemain_id, periode_tahun, periode_bulan, nominal: finalNominal, status },
    });

    const message =
      status === 'bayar_nanti'
        ? 'Membership berhasil dicatat (Bayar Nanti)'
        : status === 'gratis'
        ? 'Membership manual tanpa bayar berhasil dicatat'
        : 'Iuran berhasil dicatat (Lunas)';

    return successResponse(newIuran, message, 201);
  } catch (err) {
    console.error('[POST /iuran]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
