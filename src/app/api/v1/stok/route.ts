import { NextRequest } from 'next/server';
import { eq, and, sum, count, desc } from 'drizzle-orm';
import { db } from '@/db';
import { pembelian_bola, koreksi_stok, sesi, konfigurasi_grup } from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { parseListQuery } from '@/lib/query-helpers';
import { successResponse, errorResponse } from '@/lib/api-response';

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

    // Load config for stok_awal and isi_per_tabung
    const konfigs = await dbClient
      .select({ stok_awal: konfigurasi_grup.stok_awal, isi_per_tabung: konfigurasi_grup.isi_per_tabung })
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, ctx.grupId))
      .limit(1);

    const stokAwal = konfigs[0]?.stok_awal ?? 0;
    const isiPerTabung = konfigs[0]?.isi_per_tabung ?? 12;

    // Calculate stok saat ini
    const [pembelianSum, koreksiSum, sesiSum] = await Promise.all([
      dbClient
        .select({ total: sum(pembelian_bola.jumlah_tabung) })
        .from(pembelian_bola)
        .where(eq(pembelian_bola.grup_id, ctx.grupId)),
      dbClient
        .select({ total: sum(koreksi_stok.jumlah) })
        .from(koreksi_stok)
        .where(eq(koreksi_stok.grup_id, ctx.grupId)),
      dbClient
        .select({ total: sum(sesi.bola_terpakai) })
        .from(sesi)
        .where(eq(sesi.grup_id, ctx.grupId)),
    ]);

    const totalPembelian =
      (parseInt(pembelianSum[0]?.total ?? '0', 10) || 0) * isiPerTabung;
    const totalKoreksi = parseInt(koreksiSum[0]?.total ?? '0', 10) || 0;
    const totalTerpakai = parseInt(sesiSum[0]?.total ?? '0', 10) || 0;

    const stokSaatIni = stokAwal + totalPembelian + totalKoreksi - totalTerpakai;

    // Get riwayat (paginated) — combine pembelian and koreksi
    const [totalPembelianRows, totalKoreksiRows] = await Promise.all([
      dbClient.select({ count: count() }).from(pembelian_bola).where(eq(pembelian_bola.grup_id, ctx.grupId)),
      dbClient.select({ count: count() }).from(koreksi_stok).where(eq(koreksi_stok.grup_id, ctx.grupId)),
    ]);

    const totalRiwayat = (totalPembelianRows[0]?.count ?? 0) + (totalKoreksiRows[0]?.count ?? 0);

    // Fetch both lists sorted by date for this page
    const [pembelianRows, koreksiRows] = await Promise.all([
      dbClient
        .select()
        .from(pembelian_bola)
        .where(eq(pembelian_bola.grup_id, ctx.grupId))
        .orderBy(desc(pembelian_bola.dibuat_pada))
        .limit(per_page * 2),
      dbClient
        .select()
        .from(koreksi_stok)
        .where(eq(koreksi_stok.grup_id, ctx.grupId))
        .orderBy(desc(koreksi_stok.dibuat_pada))
        .limit(per_page * 2),
    ]);

    // Merge and sort
    type RiwayatItem =
      | { tipe: 'pembelian'; id: string; dibuat_pada: Date; jumlah_tabung: number; isi_per_tabung: number; harga_total: number; transaksi_kas_id: string | null; grup_id: string }
      | { tipe: 'koreksi'; id: string; dibuat_pada: Date; jumlah: number; alasan: string; dibuat_oleh_admin_id: string | null; grup_id: string };

    const merged: RiwayatItem[] = [
      ...pembelianRows.map((p) => ({
        tipe: 'pembelian' as const,
        ...p,
      })),
      ...koreksiRows.map((k) => ({
        tipe: 'koreksi' as const,
        ...k,
      })),
    ]
      .sort((a, b) => new Date(b.dibuat_pada).getTime() - new Date(a.dibuat_pada).getTime())
      .slice(offset, offset + per_page);

    return successResponse({
      stok_saat_ini: stokSaatIni,
      stok_awal: stokAwal,
      total_pembelian_bola: totalPembelian,
      total_koreksi: totalKoreksi,
      total_terpakai: totalTerpakai,
      riwayat: {
        data: merged,
        meta: {
          pagination: {
            page,
            per_page,
            total: totalRiwayat,
            total_pages: Math.ceil(totalRiwayat / per_page),
          },
        },
      },
    });
  } catch (err) {
    console.error('[GET /stok]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
