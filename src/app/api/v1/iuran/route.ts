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
  nominal: z.number().int().min(1, 'Nominal harus lebih dari 0'),
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

  const { pemain_id, periode_tahun, periode_bulan, nominal } = parsed.data;

  try {
    const dbClient = db();

    // Validate pemain exists in grup
    const pemainRows = await dbClient
      .select({ id: pemain.id })
      .from(pemain)
      .where(and(eq(pemain.id, pemain_id), eq(pemain.grup_id, ctx.grupId)))
      .limit(1);

    if (!pemainRows[0]) return errorResponse('Pemain tidak ditemukan', undefined, 404);

    // Validate nominal >= iuran_bulanan from config
    const konfigs = await dbClient
      .select({ iuran_bulanan: konfigurasi_grup.iuran_bulanan })
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    if (konfigs[0] && nominal < konfigs[0].iuran_bulanan) {
      return errorResponse(
        `Nominal iuran minimal Rp ${konfigs[0].iuran_bulanan}`,
        { nominal: [`Minimal Rp ${konfigs[0].iuran_bulanan}`] },
        422
      );
    }

    // Insert iuran (unique constraint will fail if duplicate)
    let newIuran;
    try {
      const rows = await dbClient
        .insert(iuran)
        .values({
          grup_id: ctx.grupId,
          pemain_id,
          periode_tahun,
          periode_bulan,
          nominal,
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

    // Create auto-transaction
    await createIuranTransaction(dbClient, {
      grupId: ctx.grupId,
      pemainId: pemain_id,
      adminId: ctx.adminId,
      iuranId: newIuran.id,
      nominal,
    });

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'iuran',
      entitasId: newIuran.id,
      detail: { pemain_id, periode_tahun, periode_bulan, nominal },
    });

    return successResponse(newIuran, 'Iuran berhasil dicatat', 201);
  } catch (err) {
    console.error('[POST /iuran]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
