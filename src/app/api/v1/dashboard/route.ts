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
  pemain,
} from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { successResponse, errorResponse } from '@/lib/api-response';
import { formatStokBola } from '@/lib/stock';

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

    // (b) Stok bola saat ini (1 tabung = 12 biji)
    const isiPerTabung = 12;

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
    const stok_bola = totalPembelian + totalKoreksi - totalTerpakai;
    const stok_bola_formatted = formatStokBola(stok_bola);

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

    // (g) Data grafik arus kas (Pemasukan vs Pengeluaran)
    let grafik_kas: { label: string; pemasukan: number; pengeluaran: number }[] = [];

    if (filter === 'bulanan') {
      const allTxMonth = await dbClient
        .select({
          nominal: transaksi_kas.nominal,
          tipe: transaksi_kas.tipe,
          dibuat_pada: transaksi_kas.dibuat_pada,
        })
        .from(transaksi_kas)
        .where(
          and(
            eq(transaksi_kas.grup_id, grupId),
            gte(transaksi_kas.dibuat_pada, start),
            lte(transaksi_kas.dibuat_pada, end)
          )
        );

      const weeks = [
        { label: 'Mgg 1', start: 1, end: 7, pemasukan: 0, pengeluaran: 0 },
        { label: 'Mgg 2', start: 8, end: 14, pemasukan: 0, pengeluaran: 0 },
        { label: 'Mgg 3', start: 15, end: 21, pemasukan: 0, pengeluaran: 0 },
        { label: 'Mgg 4+', start: 22, end: 31, pemasukan: 0, pengeluaran: 0 },
      ];

      for (const tx of allTxMonth) {
        if (!tx.dibuat_pada) continue;
        const txDate = new Date(tx.dibuat_pada);
        const day = txDate.getDate();
        const targetWeek = weeks.find((w) => day >= w.start && day <= w.end) ?? weeks[3];
        if (tx.tipe === 'pemasukan') {
          targetWeek.pemasukan += tx.nominal;
        } else {
          targetWeek.pengeluaran += tx.nominal;
        }
      }

      grafik_kas = weeks.map((w) => ({
        label: w.label,
        pemasukan: w.pemasukan,
        pengeluaran: w.pengeluaran,
      }));
    } else {
      // Harian: 7 hari terakhir hingga `tanggal`
      const endDateObj = new Date(tanggal + 'T23:59:59+07:00');
      const startDateObj = new Date(endDateObj.getTime() - 6 * 24 * 60 * 60 * 1000);
      startDateObj.setHours(0, 0, 0, 0);

      const allTx7Days = await dbClient
        .select({
          nominal: transaksi_kas.nominal,
          tipe: transaksi_kas.tipe,
          dibuat_pada: transaksi_kas.dibuat_pada,
        })
        .from(transaksi_kas)
        .where(
          and(
            eq(transaksi_kas.grup_id, grupId),
            gte(transaksi_kas.dibuat_pada, startDateObj),
            lte(transaksi_kas.dibuat_pada, endDateObj)
          )
        );

      const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      const daysMap: { [dateKey: string]: { label: string; pemasukan: number; pengeluaran: number } } = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date(endDateObj.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = d.toISOString().slice(0, 10);
        const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
        daysMap[dateKey] = { label, pemasukan: 0, pengeluaran: 0 };
      }

      for (const tx of allTx7Days) {
        if (!tx.dibuat_pada) continue;
        const txDate = new Date(tx.dibuat_pada);
        const dateKey = txDate.toISOString().slice(0, 10);
        if (daysMap[dateKey]) {
          if (tx.tipe === 'pemasukan') {
            daysMap[dateKey].pemasukan += tx.nominal;
          } else {
            daysMap[dateKey].pengeluaran += tx.nominal;
          }
        }
      }

      grafik_kas = Object.values(daysMap);
    }

    return successResponse({
      saldo_kas,
      stok_bola,
      stok_bola_formatted,
      total_pemasukan,
      total_pengeluaran,
      filter,
      tanggal,
      grafik_kas,
      transaksi_terbaru,
      ringkasan_pertemuan_terakhir,
    });
  } catch (err) {
    console.error('[GET /dashboard]', err);
    return errorResponse('Terjadi kesalahan server', undefined, 500);
  }
}
