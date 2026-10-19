// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, ilike, count, asc, desc, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pemain, iuran } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { parseListQuery } from '@/lib/query-helpers';
import { successResponse, paginatedResponse, errorResponse } from '@/lib/api-response';

const createPemainSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  no_hp: z.string().optional(),
  catatan: z.string().optional(),
  bebas_biaya: z.boolean().optional().default(false),
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

  const { page, per_page, search, sort, sort_dir } = parsed.query;
  const offset = (page - 1) * per_page;

  try {
    const dbClient = db();
    const conditions = search
      ? and(eq(pemain.grup_id, ctx.grupId), ilike(pemain.nama, `%${search}%`))
      : eq(pemain.grup_id, ctx.grupId);

    const sortCol = sort === 'aktif' ? pemain.aktif : pemain.nama;
    const orderFn = sort_dir === 'desc' ? desc : asc;

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(pemain).where(conditions),
      dbClient
        .select()
        .from(pemain)
        .where(conditions)
        .orderBy(orderFn(sortCol))
        .limit(per_page)
        .offset(offset),
    ]);

    const total = totalRows[0]?.count ?? 0;

    // Check membership for current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const pIds = rows.map((r) => r.id);
    const iuranRows = pIds.length
      ? await dbClient
          .select({
            id: iuran.id,
            pemain_id: iuran.pemain_id,
            status: iuran.status,
            nominal: iuran.nominal,
          })
          .from(iuran)
          .where(
            and(
              eq(iuran.grup_id, ctx.grupId),
              eq(iuran.periode_tahun, currentYear),
              eq(iuran.periode_bulan, currentMonth),
              inArray(iuran.pemain_id, pIds)
            )
          )
      : [];

    const iuranMap = new Map(iuranRows.map((i) => [i.pemain_id, i]));
    const enrichedRows = rows.map((r) => {
      const iuranData = iuranMap.get(r.id);
      return {
        ...r,
        is_member: !!iuranData,
        iuran_id: iuranData?.id ?? null,
        iuran_status: iuranData?.status ?? null,
        iuran_nominal: iuranData?.nominal ?? null,
      };
    });

    return paginatedResponse(enrichedRows, {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page),
    });
  } catch (err) {
    console.error('[GET /pemain]', err);
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

  const parsed = createPemainSchema.safeParse(body);
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
      .insert(pemain)
      .values({
        grup_id: ctx.grupId,
        nama: parsed.data.nama,
        no_hp: parsed.data.no_hp ?? null,
        catatan: parsed.data.catatan ?? null,
        bebas_biaya: parsed.data.bebas_biaya,
      })
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'pemain',
      entitasId: rows[0].id,
      detail: { nama: rows[0].nama },
    });

    return successResponse(rows[0], 'Pemain berhasil ditambahkan', 201);
  } catch (err) {
    console.error('[POST /pemain]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
