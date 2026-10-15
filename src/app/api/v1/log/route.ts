import { NextRequest } from 'next/server';
import { eq, and, ilike, count, desc } from 'drizzle-orm';
import { db } from '@/db';
import { log_aktivitas, admin } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { parseListQuery } from '@/lib/query-helpers';
import { paginatedResponse, errorResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const parsed = parseListQuery(request.nextUrl.searchParams);
  if (!parsed.ok) return parsed.response;

  const { page, per_page, search } = parsed.query;
  const offset = (page - 1) * per_page;

  try {
    const dbClient = db();
    const conditions = search
      ? and(
          eq(log_aktivitas.grup_id, ctx.grupId),
          ilike(log_aktivitas.aksi, `%${search}%`)
        )
      : eq(log_aktivitas.grup_id, ctx.grupId);

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(log_aktivitas).where(conditions),
      dbClient
        .select({
          id: log_aktivitas.id,
          aksi: log_aktivitas.aksi,
          entitas: log_aktivitas.entitas,
          entitas_id: log_aktivitas.entitas_id,
          detail: log_aktivitas.detail,
          alasan: log_aktivitas.alasan,
          dibuat_pada: log_aktivitas.dibuat_pada,
          admin_id: log_aktivitas.admin_id,
          admin_nama: admin.nama,
        })
        .from(log_aktivitas)
        .leftJoin(admin, eq(log_aktivitas.admin_id, admin.id))
        .where(conditions)
        .orderBy(desc(log_aktivitas.dibuat_pada))
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
    console.error('[GET /log]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
