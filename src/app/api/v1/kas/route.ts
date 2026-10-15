import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, and, count, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { transaksi_kas, kategori_kas } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { logActivity } from '@/features/activity-log/log-activity';
import { parseListQuery } from '@/lib/query-helpers';
import { paginatedResponse, successResponse, errorResponse } from '@/lib/api-response';

const createKasSchema = z.object({
  nominal: z.number().int().min(1, 'Nominal harus lebih dari 0'),
  tipe: z.enum(['pemasukan', 'pengeluaran'], {
    error: 'Tipe harus pemasukan atau pengeluaran',
  }),
  kategori_id: z.string().uuid('kategori_id tidak valid'),
  keterangan: z.string().optional().default(''),
  tanggal_transaksi: z.string().optional(),
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

  const sp = request.nextUrl.searchParams;
  const tipe = sp.get('tipe') as 'pemasukan' | 'pengeluaran' | null;
  const kategoriId = sp.get('kategori_id');
  const tanggalDari = sp.get('tanggal_dari');
  const tanggalSampai = sp.get('tanggal_sampai');
  const bulan = sp.get('bulan'); // format: YYYY-MM
  const pertemuanIdFilter = sp.get('pertemuan_id');
  
  try {
    const dbClient = db();

    const conditions = [eq(transaksi_kas.grup_id, ctx.grupId)];

    if (tipe) {
      conditions.push(eq(transaksi_kas.tipe, tipe));
    }

    if (kategoriId) {
      conditions.push(eq(transaksi_kas.kategori_id, kategoriId));
    }

    if (pertemuanIdFilter) {
      conditions.push(eq(transaksi_kas.pertemuan_id, pertemuanIdFilter));
    }

    if (bulan) {
      // bulan format YYYY-MM
      const [year, month] = bulan.split('-');
      const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
      const endDate = new Date(
        new Date(startDate).setMonth(startDate.getMonth() + 1)
      );
      conditions.push(gte(transaksi_kas.dibuat_pada, startDate));
      conditions.push(lte(transaksi_kas.dibuat_pada, endDate));
    } else {
      if (tanggalDari) {
        conditions.push(gte(transaksi_kas.dibuat_pada, new Date(tanggalDari)));
      }
      if (tanggalSampai) {
        conditions.push(lte(transaksi_kas.dibuat_pada, new Date(tanggalSampai + 'T23:59:59Z')));
      }
    }

    const condition = and(...conditions);

    const [totalRows, rows] = await Promise.all([
      dbClient.select({ count: count() }).from(transaksi_kas).where(condition),
      dbClient
        .select({
          id: transaksi_kas.id,
          grup_id: transaksi_kas.grup_id,
          kategori_id: transaksi_kas.kategori_id,
          nominal: transaksi_kas.nominal,
          tipe: transaksi_kas.tipe,
          keterangan: transaksi_kas.keterangan,
          referensi_tipe: transaksi_kas.referensi_tipe,
          referensi_id: transaksi_kas.referensi_id,
          pertemuan_id: transaksi_kas.pertemuan_id,
          dapat_diubah: transaksi_kas.dapat_diubah,
          dibuat_pada: transaksi_kas.dibuat_pada,
          dibuat_oleh_admin_id: transaksi_kas.dibuat_oleh_admin_id,
          kategori_nama: sql<string | null>`${kategori_kas.nama}`,
        })
        .from(transaksi_kas)
        .leftJoin(kategori_kas, eq(transaksi_kas.kategori_id, kategori_kas.id))
        .where(condition)
        .orderBy(desc(transaksi_kas.dibuat_pada))
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
    console.error('[GET /kas]', err);
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

  const parsed = createKasSchema.safeParse(body);
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

    // Validate kategori belongs to grup
    const kategoriRows = await dbClient
      .select({ id: kategori_kas.id, tipe: kategori_kas.tipe })
      .from(kategori_kas)
      .where(
        and(
          eq(kategori_kas.id, parsed.data.kategori_id),
          eq(kategori_kas.grup_id, ctx.grupId),
          eq(kategori_kas.aktif, true)
        )
      )
      .limit(1);

    if (!kategoriRows[0]) {
      return errorResponse('Kategori tidak ditemukan atau tidak aktif', undefined, 400);
    }

    if (kategoriRows[0].tipe !== parsed.data.tipe) {
      return errorResponse(
        `Kategori tipe "${kategoriRows[0].tipe}" tidak cocok dengan tipe transaksi "${parsed.data.tipe}"`,
        undefined,
        400
      );
    }

    const rows = await dbClient
      .insert(transaksi_kas)
      .values({
        grup_id: ctx.grupId,
        kategori_id: parsed.data.kategori_id,
        nominal: parsed.data.nominal,
        tipe: parsed.data.tipe,
        keterangan: parsed.data.keterangan,
        dapat_diubah: true,
        dibuat_oleh_admin_id: ctx.adminId,
      })
      .returning();

    await logActivity({
      grupId: ctx.grupId,
      adminId: ctx.adminId,
      aksi: 'CREATE',
      entitas: 'transaksi_kas',
      entitasId: rows[0].id,
      detail: { nominal: rows[0].nominal, tipe: rows[0].tipe },
    });

    return successResponse(rows[0], 'Transaksi kas berhasil ditambahkan', 201);
  } catch (err) {
    console.error('[POST /kas]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
