// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, count, asc } from 'drizzle-orm';
import { db } from '@/db';
import { kategori_kas } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { parseListQuery } from '@/lib/query-helpers';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';

const createKategoriSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  tipe: z.enum(['pemasukan', 'pengeluaran'], {
    error: 'Tipe harus pemasukan atau pengeluaran',
  }),
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

  try {
    const dbClient = db();
    const condition = eq(kategori_kas.grup_id, ctx.grupId);

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(kategori_kas).where(condition),
      dbClient
        .select()
        .from(kategori_kas)
        .where(condition)
        .orderBy(asc(kategori_kas.nama))
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
    console.error('[GET /kategori-kas]', err);
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

  const parsed = createKategoriSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      errors[key] = errors[key] ? [...errors[key], issue.message] : [issue.message];
    }
    return errorResponse('Validasi gagal', errors, 422);
  }

  try {
    const rows = await db()
      .insert(kategori_kas)
      .values({
        grup_id: ctx.grupId,
        nama: parsed.data.nama,
        tipe: parsed.data.tipe,
        adalah_sistem: false,
      })
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'kategori_kas',
      entitasId: rows[0].id,
      detail: { nama: rows[0].nama, tipe: rows[0].tipe },
    });

    return successResponse(rows[0], 'Kategori berhasil ditambahkan', 201);
  } catch (err) {
    console.error('[POST /kategori-kas]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
