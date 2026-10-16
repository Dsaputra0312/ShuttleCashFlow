// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, count, desc } from 'drizzle-orm';
import { db } from '@/db';
import { pertemuan, konfigurasi_grup } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { parseListQuery } from '@/lib/query-helpers';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';

const createPertemuanSchema = z.object({
  tanggal: z.string().optional(), // ISO date string YYYY-MM-DD
});

/** Get the next play day from today using configured hari_main (0=Sun, 1=Mon, ..., 6=Sat) */
function getNextPlayDay(hariMain: number[]): string {
  const today = new Date();
  const todayDay = today.getDay();
  // Find the nearest upcoming day (including today)
  let minDiff = 7;
  for (const day of hariMain) {
    const diff = (day - todayDay + 7) % 7;
    if (diff < minDiff) minDiff = diff;
  }
  const next = new Date(today);
  next.setDate(today.getDate() + minDiff);
  return next.toISOString().split('T')[0];
}

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

  try {
    const dbClient = db();
    const condition = eq(pertemuan.grup_id, ctx.grupId);

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(pertemuan).where(condition),
      dbClient
        .select()
        .from(pertemuan)
        .where(condition)
        .orderBy(desc(pertemuan.tanggal))
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
    console.error('[GET /pertemuan]', err);
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
    body = {};
  }

  const parsed = createPertemuanSchema.safeParse(body);
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

    // Load konfigurasi
    const konfigs = await dbClient
      .select()
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    if (konfigs.length === 0) {
      return errorResponse('Konfigurasi belum diatur', undefined, 400);
    }
    const config = konfigs[0];

    const tanggal = parsed.data.tanggal ?? getNextPlayDay(config.hari_main as number[]);

    const rows = await dbClient
      .insert(pertemuan)
      .values({
        grup_id: ctx.grupId,
        tanggal,
        konfigurasi_snapshot: {
          harga_bola_per_biji: config.harga_bola_per_biji,
          isi_per_tabung: config.isi_per_tabung,
          biaya_lapangan_non_member: config.biaya_lapangan_non_member,
          iuran_bulanan: config.iuran_bulanan,
          kelipatan_pembulatan: config.kelipatan_pembulatan,
          biaya_sewa_default: config.biaya_sewa_default,
        },
      })
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'pertemuan',
      entitasId: rows[0].id,
      detail: { tanggal },
    });

    return successResponse(rows[0], 'Pertemuan berhasil dibuat', 201);
  } catch (err) {
    console.error('[POST /pertemuan]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
