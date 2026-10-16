// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and, sum, desc, gte, lte } from 'drizzle-orm';
import { db } from '@/db';
import {
  transaksi_kas,
  pertemuan,
  peserta_pertemuan,
  pembelian_bola,
  koreksi_stok,
  sesi,
  konfigurasi_grup,
  pemain,
} from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { successResponse, errorResponse } from '@/lib/api-response';

/** Today's date in WIB (UTC+7) as YYYY-MM-DD */
function todayWIB(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().split('T')[0];
}

/** Return [startDate, endDate) for a filter+tanggal combination */
function getDateRange(
  filter: 'harian' | 'bulanan',
  tanggal: string
): { start: Date; end: Date } {
  if (filter === 'harian') {
    const start = new Date(tanggal + 'T00:00:00+07:00');
    const end = new Date(tanggal + 'T23:59:59+07:00');
    return { start, end };
  }
  // bulanan: whole month
  const [year, month] = tanggal.split('-').map(Number);
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+07:00`);
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00+07:00`);
  return { start, end };
}

export async function GET(request: NextRequest) {
  let ctx;
  try {
    ctx = await getGrupContext();
  } catch (res) {
    return res as Response;
  }

  const sp = request.nextUrl.searchParams;
  const filter = (sp.get('filter') ?? 'harian') as 'harian' | 'bulanan';
  const tanggal = sp.get('tanggal') ?? todayWIB();

  if (!['harian', 'bulanan'].includes(filter)) {
    return errorResponse('Filter harus harian atau bulanan', undefined, 422);
  }

  try {
    const dbClient = db();
    const grupId = ctx.grupId;

    // (a) Saldo kas = SUM(pemasukan) - SUM(pengeluaran) across all time
    const [pemasukanAll, pengeluaranAll] = await Promise.all([
      dbClient
        .select({ total: sum(transaksi_kas.nominal) })
        .from(transaksi_kas)
        .where(and(eq(transaksi_kas.grup_id, grupId), eq(transaksi_kas.tipe, 'pemasukan'))),
      dbClient
        .select({ total: sum(transaksi_kas.nominal) })
        .from(transaksi_kas)
        .where(and(eq(transaksi_kas.grup_id, grupId), eq(transaksi_kas.tipe, 'pengeluaran'))),
    ]);

    const totalPemasukanAll = parseInt(pemasukanAll[0]?.total ?? '0', 10) || 0;
    const totalPengeluaranAll = parseInt(pengeluaranAll[0]?.total ?? '0', 10) || 0;
    const saldo_kas = totalPemasukanAll - totalPengeluaranAll;

    // (b) Stok bola saat ini
    const konfigs = await dbClient
      .select({
        stok_awal: konfigurasi_grup.stok_awal,
        isi_per_tabung: konfigurasi_grup.isi_per_tabung,
      })
      .from(konfigurasi_grup)
      .where(eq(konfigurasi_grup.grup_id, grupId))
      .limit(1);

    const stokAwal = konfigs[0]?.stok_awal ?? 0;
    const isiPerTabung = konfigs[0]?.isi_per_tabung ?? 12;

    const [pembelianSum, koreksiSum, sesiSum] = await Promise.all([
      dbClient
        .select({ total: sum(pembelian_bola.jumlah_tabung) })
        .from(pembelian_bola)
        .where(eq(pembelian_bola.grup_id, grupId)),
      dbClient
        .select({ total: sum(koreksi_stok.jumlah) })
        .from(koreksi_stok)
        .where(eq(koreksi_stok.grup_id, grupId)),
      dbClient
        .select({ total: sum(sesi.bola_terpakai) })
        .from(sesi)
        .where(eq(sesi.grup_id, grupId)),
    ]);

    const totalPembelian = (parseInt(pembelianSum[0]?.total ?? '0', 10) || 0) * isiPerTabung;
    const totalKoreksi = parseInt(koreksiSum[0]?.total ?? '0', 10) || 0;
    const totalTerpakai = parseInt(sesiSum[0]?.total ?? '0', 10) || 0;
    const stok_bola = stokAwal + totalPembelian + totalKoreksi - totalTerpakai;

    // (c) & (d) Pemasukan & pengeluaran for filter period
    const { start, end } = getDateRange(filter, tanggal);

    const [pemasukanPeriode, pengeluaranPeriode] = await Promise.all([
      dbClient
        .select({ total: sum(transaksi_kas.nominal) })
        .from(transaksi_kas)
        .where(
          and(
            eq(transaksi_kas.grup_id, grupId),
            eq(transaksi_kas.tipe, 'pemasukan'),
            gte(transaksi_kas.dibuat_pada, start),
            lte(transaksi_kas.dibuat_pada, end)
          )
        ),
      dbClient
        .select({ total: sum(transaksi_kas.nominal) })
        .from(transaksi_kas)
        .where(
          and(
            eq(transaksi_kas.grup_id, grupId),
            eq(transaksi_kas.tipe, 'pengeluaran'),
            gte(transaksi_kas.dibuat_pada, start),
            lte(transaksi_kas.dibuat_pada, end)
          )
        ),
    ]);

    const total_pemasukan = parseInt(pemasukanPeriode[0]?.total ?? '0', 10) || 0;
    const total_pengeluaran = parseInt(pengeluaranPeriode[0]?.total ?? '0', 10) || 0;

    // (e) 5 transaksi terbaru
    const raw_transaksi_terbaru = await dbClient
      .select()
      .from(transaksi_kas)
      .where(eq(transaksi_kas.grup_id, grupId))
      .orderBy(desc(transaksi_kas.dibuat_pada))
      .limit(5);

    // Resolve any player UUIDs in keterangan
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const hasUuid = raw_transaksi_terbaru.some((t) => uuidRegex.test(t.keterangan || ''));
    let transaksi_terbaru = raw_transaksi_terbaru;

    if (hasUuid) {
      const allPemain = await dbClient
        .select({ id: pemain.id, nama: pemain.nama })
        .from(pemain)
        .where(eq(pemain.grup_id, grupId));
      const pMap = new Map(allPemain.map((p) => [p.id, p.nama]));

      transaksi_terbaru = raw_transaksi_terbaru.map((t) => {
        let ket = t.keterangan || '';
        const match = ket.match(uuidRegex);
        if (match && pMap.has(match[0])) {
          const pName = pMap.get(match[0])!;
          ket = ket
            .replace(new RegExp(`pemain\\s+${match[0]}`, 'gi'), `— ${pName}`)
            .replace(new RegExp(match[0], 'g'), pName);
        }
        return { ...t, keterangan: ket };
      });
    }

    // (f) Ringkasan pertemuan terakhir
    const pertemuanTerakhir = await dbClient
      .select()
      .from(pertemuan)
      .where(eq(pertemuan.grup_id, grupId))
      .orderBy(desc(pertemuan.tanggal))
      .limit(1);

    let ringkasan_pertemuan_terakhir = null;
    if (pertemuanTerakhir.length > 0) {
      const pt = pertemuanTerakhir[0];
      const pesertaRows = await dbClient
        .select({ tagihan: peserta_pertemuan.tagihan })
        .from(peserta_pertemuan)
        .where(
          and(
            eq(peserta_pertemuan.pertemuan_id, pt.id),
            eq(peserta_pertemuan.grup_id, grupId)
          )
        );

      const jumlah_pemain = pesertaRows.length;
      const total_tagihan = pesertaRows.reduce((acc, p) => acc + (p.tagihan ?? 0), 0);

      ringkasan_pertemuan_terakhir = {
        id: pt.id,
        tanggal: pt.tanggal,
        terkunci: pt.terkunci,
        jumlah_pemain,
        total_tagihan,
      };
    }

    return successResponse({
      saldo_kas,
      stok_bola,
      total_pemasukan,
      total_pengeluaran,
      filter,
      tanggal,
      transaksi_terbaru,
      ringkasan_pertemuan_terakhir,
    });
  } catch (err) {
    console.error('[GET /dashboard]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
