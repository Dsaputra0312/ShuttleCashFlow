// FEAT-006 T5.3 Auth+Scoping Checklist:
// [✓] getGrupContext() called — 401 returned if session missing/invalid
// [✓] All DB queries scoped with grup_id from session context
// [✓] No cross-grup data leakage possible

import { NextRequest } from 'next/server';
import { eq, and, sum, desc, gte, lte, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  transaksi_kas,
  pertemuan,
  peserta_pertemuan,
  pembelian_bola,
  koreksi_stok,
  sesi,
  sesi_pemain,
  pemain,
  iuran,
  kategori_kas,
} from '@/db/schema';
import { getGrupContext } from '@/features/auth/get-grup-context';
import { successResponse, errorResponse } from '@/lib/api-response';
import { formatStokBola } from '@/lib/stock';
import { hitungTagihan } from '@/features/billing/calculator';

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
      const [pesertaRows, sesiRows, txPertemuanRows] = await Promise.all([
        dbClient
          .select({
            id: peserta_pertemuan.id,
            pemain_id: peserta_pertemuan.pemain_id,
            tagihan: peserta_pertemuan.tagihan,
            dibayar: peserta_pertemuan.dibayar,
            status_main: peserta_pertemuan.status_main,
          })
          .from(peserta_pertemuan)
          .where(
            and(
              eq(peserta_pertemuan.pertemuan_id, pt.id),
              eq(peserta_pertemuan.grup_id, grupId)
            )
          ),
        dbClient
          .select({
            id: sesi.id,
            lapangan: sesi.lapangan,
            bola_terpakai: sesi.bola_terpakai,
            ditanggung_oleh_pemain_id: sesi.ditanggung_oleh_pemain_id,
          })
          .from(sesi)
          .where(
            and(
              eq(sesi.pertemuan_id, pt.id),
              eq(sesi.grup_id, grupId)
            )
          ),
        dbClient
          .select({
            id: transaksi_kas.id,
            nominal: transaksi_kas.nominal,
            tipe: transaksi_kas.tipe,
            keterangan: transaksi_kas.keterangan,
            referensi_tipe: transaksi_kas.referensi_tipe,
            kategori_id: transaksi_kas.kategori_id,
            kategori_nama: kategori_kas.nama,
          })
          .from(transaksi_kas)
          .leftJoin(kategori_kas, eq(transaksi_kas.kategori_id, kategori_kas.id))
          .where(
            and(
              eq(transaksi_kas.grup_id, grupId),
              eq(transaksi_kas.pertemuan_id, pt.id)
            )
          ),
      ]);

      const sesiIds = sesiRows.map((s) => s.id);
      const pemainIds = pesertaRows.map((p) => p.pemain_id);

      const [sesiPemainRows, pemainRows] = await Promise.all([
        sesiIds.length > 0
          ? dbClient
              .select({
                sesi_id: sesi_pemain.sesi_id,
                pemain_id: sesi_pemain.pemain_id,
              })
              .from(sesi_pemain)
              .where(inArray(sesi_pemain.sesi_id, sesiIds))
          : [],
        pemainIds.length > 0
          ? dbClient
              .select({
                id: pemain.id,
                nama: pemain.nama,
                bebas_biaya: pemain.bebas_biaya,
              })
              .from(pemain)
              .where(inArray(pemain.id, pemainIds))
          : [],
      ]);

      const ptDate = pt.tanggal ? new Date(pt.tanggal + 'T00:00:00') : new Date();
      const meetingYear = ptDate.getFullYear();
      const meetingMonth = ptDate.getMonth() + 1;

      const iuranRows =
        pemainIds.length > 0
          ? await dbClient
              .select({ pemain_id: iuran.pemain_id })
              .from(iuran)
              .where(
                and(
                  eq(iuran.grup_id, grupId),
                  inArray(iuran.pemain_id, pemainIds),
                  eq(iuran.periode_tahun, meetingYear),
                  eq(iuran.periode_bulan, meetingMonth)
                )
              )
          : [];
      const memberSet = new Set(iuranRows.map((i) => i.pemain_id));

      const snap = (pt.konfigurasi_snapshot ?? {}) as Record<string, number>;
      const config = {
        harga_bola_per_biji: snap.harga_bola_per_biji ?? 5000,
        biaya_lapangan_non_member: snap.biaya_lapangan_non_member ?? 10000,
        kelipatan_pembulatan: snap.kelipatan_pembulatan ?? 1000,
      };

      const sesiInputs = sesiRows.map((s) => ({
        id: s.id,
        lapangan: s.lapangan,
        bola_terpakai: s.bola_terpakai,
        ditanggung_oleh_pemain_id: s.ditanggung_oleh_pemain_id,
        pemain_ids: sesiPemainRows
          .filter((sp) => sp.sesi_id === s.id)
          .map((sp) => sp.pemain_id),
      }));

      const pemainInputs = pemainRows.map((p) => ({
        id: p.id,
        bebas_biaya: p.bebas_biaya,
        is_member: memberSet.has(p.id),
      }));

      const billingResult = hitungTagihan(sesiInputs, pemainInputs, config);
      const total_biaya_bola = billingResult.tagihan_per_pemain.reduce(
        (acc, p) => acc + p.biaya_bola_raw,
        0
      );
      const total_biaya_lapangan = billingResult.tagihan_per_pemain.reduce(
        (acc, p) => acc + p.biaya_lapangan_raw,
        0
      );
      const total_bola = billingResult.total_bola_terpakai;
      const count_non_member = billingResult.tagihan_per_pemain.filter(
        (p) => p.biaya_lapangan_raw > 0
      ).length;

      const jumlah_pemain = pesertaRows.length;
      const total_tagihan = pesertaRows.reduce((acc, p) => acc + (p.tagihan ?? 0), 0);
      const total_dibayar = pesertaRows.reduce((acc, p) => acc + (p.dibayar ?? 0), 0);
      const jumlah_sesi = sesiRows.length;

      // Pemasukan dan pengeluaran transaksi kas untuk pertemuan ini
      const pemasukan_pertemuan = txPertemuanRows
        .filter((t) => t.tipe === 'pemasukan')
        .reduce((acc, t) => acc + t.nominal, 0);

      const pengeluaran_pertemuan = txPertemuanRows
        .filter((t) => t.tipe === 'pengeluaran')
        .reduce((acc, t) => acc + t.nominal, 0);

      // Saldo kas saat ini adalah saldo_kas (seluruh kas grup)
      const saldo_saat_ini = saldo_kas;
      // Saldo akhir sebelum pertemuan terakhir = saldo_kas - pemasukan_pertemuan + pengeluaran_pertemuan
      const saldo_sebelum = saldo_saat_ini - pemasukan_pertemuan + pengeluaran_pertemuan;

      // (1) Rincian Pemasukan — Untuk pemasukan bola jadikan 1 baris saja
      const rincian_pemasukan: { deskripsi: string; nominal: number }[] = [];
      if (total_bola > 0 || total_biaya_bola > 0) {
        rincian_pemasukan.push({
          deskripsi: `Pemasukan Bola (${total_bola} kok)`,
          nominal: total_biaya_bola,
        });
      }
      if (total_biaya_lapangan > 0) {
        rincian_pemasukan.push({
          deskripsi: `Pemasukan Lapangan (${count_non_member} non-member)`,
          nominal: total_biaya_lapangan,
        });
      }
      const total_pembulatan = billingResult.tagihan_per_pemain.reduce(
        (acc, p) => acc + Math.max(0, p.tagihan - (p.biaya_bola_raw + p.biaya_lapangan_raw)),
        0
      );
      if (total_pembulatan > 0) {
        rincian_pemasukan.push({
          deskripsi: 'Pembulatan Tagihan',
          nominal: total_pembulatan,
        });
      }

      const kelebihanBayarTxs = txPertemuanRows.filter(
        (t) =>
          t.tipe === 'pemasukan' &&
          (t.keterangan?.toLowerCase().includes('kelebihan') ||
            t.kategori_nama?.toLowerCase().includes('kelebihan'))
      );
      const total_kelebihan_tx = kelebihanBayarTxs.reduce((acc, t) => acc + t.nominal, 0);
      const total_kelebihan_peserta = pesertaRows.reduce((acc, p) => {
        if (p.status_main === 'lunas' && (p.dibayar ?? 0) > (p.tagihan ?? 0)) {
          return acc + ((p.dibayar ?? 0) - (p.tagihan ?? 0));
        }
        return acc;
      }, 0);
      const total_kelebihan = Math.max(total_kelebihan_tx, total_kelebihan_peserta);
      if (total_kelebihan > 0) {
        rincian_pemasukan.push({
          deskripsi: 'Kelebihan Bayar',
          nominal: total_kelebihan,
        });
      }
      const otherPemasukanTxs = txPertemuanRows.filter(
        (t) =>
          t.tipe === 'pemasukan' &&
          t.referensi_tipe !== 'peserta_pertemuan' &&
          !t.keterangan?.toLowerCase().includes('tagihan') &&
          !t.keterangan?.toLowerCase().includes('kelebihan')
      );
      for (const ot of otherPemasukanTxs) {
        rincian_pemasukan.push({
          deskripsi: ot.keterangan || ot.kategori_nama || 'Pemasukan Lain',
          nominal: ot.nominal,
        });
      }

      // (2) Rincian Pengeluaran — Rinci setiap transaksi kas pengeluaran
      const pengeluaranTxs = txPertemuanRows.filter((t) => t.tipe === 'pengeluaran');
      const rincian_pengeluaran = pengeluaranTxs.map((t) => ({
        deskripsi: t.keterangan || t.kategori_nama || 'Pengeluaran',
        nominal: t.nominal,
      }));

      ringkasan_pertemuan_terakhir = {
        id: pt.id,
        tanggal: pt.tanggal,
        terkunci: pt.terkunci,
        jumlah_pemain,
        jumlah_sesi,
        total_bola,
        total_tagihan,
        total_dibayar,
        pemasukan: pemasukan_pertemuan,
        pengeluaran: pengeluaran_pertemuan,
        saldo_sebelum,
        saldo_saat_ini,
        rincian_pemasukan,
        rincian_pengeluaran,
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
