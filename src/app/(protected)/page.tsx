'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarPlus,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Share2,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { formatRupiah } from '@/lib/money';
import { HeroCard } from '@/components/ui/HeroCard';
import { QuickActions } from '@/components/ui/QuickActions';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Timeline } from '@/components/ui/Timeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { BarChart } from '@/components/ui/BarChart';
import { ShuttlecockIcon } from '@/components/ui/ShuttlecockIcon';
import { RekapWhatsAppSheet } from '@/components/pertemuan/RekapWhatsAppSheet';

type Filter = 'harian' | 'bulanan';

interface TransaksiItem {
  id: string;
  tipe: 'pemasukan' | 'pengeluaran';
  nominal: number;
  keterangan: string;
  dibuat_pada: string;
}

interface RincianItem {
  deskripsi: string;
  nominal: number;
}

interface RingkasanPertemuan {
  id: string;
  tanggal: string;
  terkunci: boolean;
  jumlah_pemain: number;
  jumlah_sesi?: number;
  total_bola?: number;
  total_tagihan: number;
  total_dibayar?: number;
  pemasukan: number;
  pengeluaran: number;
  saldo_sebelum: number;
  saldo_saat_ini: number;
  rincian_pemasukan?: RincianItem[];
  rincian_pengeluaran?: RincianItem[];
}

interface BarChartDataItem {
  label: string;
  pemasukan: number;
  pengeluaran: number;
}

interface DashboardData {
  saldo_kas: number;
  stok_bola: number;
  stok_bola_formatted?: string;
  total_pemasukan: number;
  total_pengeluaran: number;
  filter: Filter;
  tanggal: string;
  grafik_kas?: BarChartDataItem[];
  transaksi_terbaru: TransaksiItem[];
  ringkasan_pertemuan_terakhir: RingkasanPertemuan | null;
}

function formatTanggalPendek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTanggalLengkap(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function generateLaporanPertemuanText(pt: RingkasanPertemuan): string {
  const lines: string[] = [];
  lines.push('🏸 *LAPORAN KAS PERTEMUAN TERAKHIR*');
  lines.push(`📅 ${formatTanggalLengkap(pt.tanggal)}`);
  lines.push('');
  lines.push(`💰 *Saldo Sebelumnya:* ${formatRupiah(pt.saldo_sebelum)}`);
  lines.push('');

  // Rincian Pemasukan
  lines.push(`📥 *Pemasukan:* +${formatRupiah(pt.pemasukan)}`);
  if (pt.rincian_pemasukan && pt.rincian_pemasukan.length > 0) {
    pt.rincian_pemasukan.forEach((item) => {
      lines.push(`   • ${item.deskripsi}: ${formatRupiah(item.nominal)}`);
    });
    if (
      pt.total_tagihan > 0 &&
      pt.total_dibayar !== undefined
    ) {
      const kelebihan = Math.max(0, pt.total_dibayar - pt.total_tagihan);
      const sisaBelumLunas = Math.max(0, pt.total_tagihan - (pt.total_dibayar - kelebihan));
      if (sisaBelumLunas > 0) {
        lines.push(
          `   _(Tagihan: ${formatRupiah(pt.total_tagihan)} | Masuk Kas: ${formatRupiah(
            pt.total_dibayar
          )} | Belum Lunas: ${formatRupiah(sisaBelumLunas)})_`
        );
      } else if (kelebihan > 0) {
        lines.push(
          `   _(Tagihan: ${formatRupiah(pt.total_tagihan)} | Masuk Kas: ${formatRupiah(
            pt.total_dibayar
          )} | Kelebihan: +${formatRupiah(kelebihan)})_`
        );
      }
    }
  } else {
    lines.push('   • _(Tidak ada pemasukan)_: Rp 0');
  }
  lines.push('');

  // Rincian Pengeluaran
  lines.push(`📤 *Pengeluaran:* -${formatRupiah(pt.pengeluaran)}`);
  if (pt.rincian_pengeluaran && pt.rincian_pengeluaran.length > 0) {
    pt.rincian_pengeluaran.forEach((item) => {
      lines.push(`   • ${item.deskripsi}: ${formatRupiah(item.nominal)}`);
    });
  } else {
    lines.push('   • _(Tidak ada pengeluaran)_: Rp 0');
  }
  lines.push('');

  lines.push('────────────────────────');
  lines.push(`💵 *Saldo Kas Saat Ini:* *${formatRupiah(pt.saldo_saat_ini)}*`);

  if (pt.jumlah_pemain > 0) {
    lines.push('');
    lines.push('*Rincian Mabar:*');
    lines.push(`• Total Pemain: ${pt.jumlah_pemain} orang`);
    if (pt.jumlah_sesi) {
      lines.push(
        `• Sesi Dimainkan: ${pt.jumlah_sesi} sesi (${pt.total_bola ?? 0} shuttlecock)`
      );
    }
    if (pt.total_tagihan) {
      const isLunas = (pt.total_dibayar ?? 0) >= pt.total_tagihan;
      const kelebihan = Math.max(0, (pt.total_dibayar ?? 0) - pt.total_tagihan);
      let statusText = isLunas ? 'Lunas' : `Terbayar: ${formatRupiah(pt.total_dibayar ?? 0)}`;
      if (kelebihan > 0) {
        statusText += `, lebih +${formatRupiah(kelebihan)}`;
      }
      lines.push(
        `• Tagihan Mabar: ${formatRupiah(pt.total_tagihan)} (${statusText})`
      );
      if (kelebihan > 0) {
        lines.push(`• Total Masuk Kas: ${formatRupiah(pt.total_dibayar ?? 0)}`);
      }
    }
  }

  lines.push('');
  lines.push('Salam kompak,');
  lines.push('*ShuttleCashFlow*');

  return lines.join('\n');
}

function formatWaktu(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTodayWIB(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function getCurrentMonthWIB(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 7); // YYYY-MM
}

export default function BerandaPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('harian');
  const [tanggal, setTanggal] = useState<string>('');
  const [bulan, setBulan] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Rekap WA Sheet & Accordion Laporan
  const [laporanExpanded, setLaporanExpanded] = useState(false);
  const [rekapSheetOpen, setRekapSheetOpen] = useState(false);
  const [rekapTeks, setRekapTeks] = useState('');

  const handleOpenRekap = (pt: RingkasanPertemuan) => {
    const teks = generateLaporanPertemuanText(pt);
    setRekapTeks(teks);
    setRekapSheetOpen(true);
  };

  // Initialise dates on client only to avoid Next.js prerender error
  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        setTanggal(getTodayWIB());
        setBulan(getCurrentMonthWIB());
      }
    });
    return () => {
      ignore = true;
    };
  }, []);

  const fetchDashboard = useCallback(async (f: Filter, tgl: string, bln: string) => {
    setLoading(true);
    try {
      const param = f === 'harian' ? tgl : bln + '-01';
      const res = await fetch(`/api/v1/dashboard?filter=${f}&tanggal=${param}`);
      const json = await res.json();
      if (res.ok) {
        setData(json.data as DashboardData);
      }
    } catch {
      // silently ignore — data stays stale
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!tanggal || !bulan) return;
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchDashboard(filter, tanggal, bulan);
      }
    });
    return () => {
      ignore = true;
    };
  }, [filter, tanggal, bulan, fetchDashboard]);

  const pertemuanTerakhir = data?.ringkasan_pertemuan_terakhir;

  const quickActions = [
    {
      icon: CalendarPlus,
      tint: 'orange' as const,
      label: 'Pertemuan',
      onClick: () => router.push('/pertemuan'),
    },
    {
      icon: Wallet,
      tint: 'mint' as const,
      label: 'Catat Kas',
      onClick: () => router.push('/kas'),
    },
    {
      icon: <ShuttlecockIcon size={20} />,
      tint: 'peach' as const,
      label: 'Lihat Stok',
      onClick: () => router.push('/lainnya/stok'),
    },
  ];

  const filterPeriodeLabel =
    filter === 'harian' && tanggal
      ? formatTanggalPendek(tanggal)
      : bulan ?? '';

  // Build timeline items from transaksi_terbaru
  const timelineItems = (data?.transaksi_terbaru ?? []).map((t) => ({
    content: (
      <div className="flex items-start justify-between gap-2">
        <span className="text-body text-ink-900 truncate">{t.keterangan || '—'}</span>
        <span
          className={[
            'text-caption font-medium shrink-0 nums',
            t.tipe === 'pemasukan' ? 'text-icon-mint' : 'text-danger',
          ].join(' ')}
        >
          {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.nominal)}
        </span>
      </div>
    ),
    time: formatWaktu(t.dibuat_pada),
  }));

  const defaultChartData =
    filter === 'bulanan'
      ? [
        { label: 'Mgg 1', pemasukan: 0, pengeluaran: 0 },
        { label: 'Mgg 2', pemasukan: 0, pengeluaran: 0 },
        { label: 'Mgg 3', pemasukan: 0, pengeluaran: 0 },
        { label: 'Mgg 4+', pemasukan: 0, pengeluaran: 0 },
      ]
      : [
        { label: 'H-6', pemasukan: 0, pengeluaran: 0 },
        { label: 'H-5', pemasukan: 0, pengeluaran: 0 },
        { label: 'H-4', pemasukan: 0, pengeluaran: 0 },
        { label: 'H-3', pemasukan: 0, pengeluaran: 0 },
        { label: 'H-2', pemasukan: 0, pengeluaran: 0 },
        { label: 'Kemarin', pemasukan: 0, pengeluaran: 0 },
        { label: 'Hari ini', pemasukan: 0, pengeluaran: 0 },
      ];

  return (
    <div>
      {/* Filter toggle + date picker */}
      <Section>
        <div className="flex items-center gap-3">
          <Tabs
            tabs={[
              { key: 'harian', label: 'Harian' },
              { key: 'bulanan', label: 'Bulanan' },
            ]}
            active={filter}
            onChange={(k) => setFilter(k as Filter)}
            variant="pill"
            className="flex-1"
          />
          {filter === 'harian' ? (
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              aria-label="Pilih tanggal"
              className="flex-1 h-10 rounded-lg border border-line bg-surface px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
            />
          ) : (
            <input
              type="month"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              aria-label="Pilih bulan"
              className="flex-1 h-10 rounded-lg border border-line bg-surface px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
            />
          )}
        </div>
      </Section>

      {/* Hero Card — Saldo Kas */}
      <Section className="pt-0">
        {loading ? (
          <div className="rounded-2xl bg-primary-700 p-5 h-24 animate-pulse" />
        ) : (
          <HeroCard
            title="Saldo Kas"
            value={formatRupiah(data?.saldo_kas ?? 0)}
            subtitle={filterPeriodeLabel}
          />
        )}
      </Section>

      {/* Ringkasan Arus Kas Masuk vs Keluar Periode Ini */}
      <Section className="pt-0">
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl border border-emerald-200/70 bg-emerald-50/50 shadow-xs p-3.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all"
            aria-label="Pemasukan"
          >
            <span className="text-title font-bold text-emerald-700 nums leading-none">
              +{formatRupiah(data?.total_pemasukan ?? 0)}
            </span>
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-2xs">
              <ArrowDownLeft className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </div>

          <div
            className="rounded-2xl border border-pink-200/70 bg-pink-50/50 shadow-xs p-3.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all"
            aria-label="Pengeluaran"
          >
            <span className="text-title font-bold text-danger nums leading-none">
              -{formatRupiah(data?.total_pengeluaran ?? 0)}
            </span>
            <div className="w-7 h-7 rounded-full bg-pink-100 flex items-center justify-center text-danger shadow-2xs">
              <ArrowUpRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </Section>

      {/* Laporan Kas Pertemuan Terakhir (Accordion) */}
      {pertemuanTerakhir && (
        <Section className="pt-0">
          <div className="bg-surface rounded-2xl border border-line shadow-card overflow-hidden transition-all duration-200">
            {/* Header Card (Accordion Toggle) */}
            <button
              type="button"
              onClick={() => setLaporanExpanded((prev) => !prev)}
              className="w-full p-4 flex items-center justify-between text-left focus:outline-none transition-colors hover:bg-peach-50/50 cursor-pointer"
              aria-expanded={laporanExpanded}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-bold text-ink-900 text-[13px] leading-snug">
                    Laporan Pertemuan Terakhir
                  </h3>
                  <p className="text-caption text-ink-500 mt-0.5 truncate">
                    {formatTanggalLengkap(pertemuanTerakhir.tanggal)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`px-2.5 py-1 rounded-full text-caption font-semibold ${
                    pertemuanTerakhir.terkunci
                      ? 'bg-ink-100 text-ink-700'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {pertemuanTerakhir.terkunci ? 'Terkunci' : 'Aktif'}
                </span>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                    laporanExpanded
                      ? 'bg-primary-100 text-primary-700 rotate-180'
                      : 'bg-peach-100 text-ink-600'
                  }`}
                  aria-hidden="true"
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Accordion Body */}
            {laporanExpanded && (
              <div className="px-4 pb-4 pt-1 flex flex-col gap-3.5 border-t border-line/60">
                {/* 4 Financial Report Metrics */}
                <div className="grid grid-cols-2 gap-2.5">
                  {/* 1. Saldo Sebelum Pertemuan Terakhir */}
                  <div className="bg-peach-50/70 rounded-xl border border-line/60 p-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-ink-500">Saldo Sebelum</span>
                    <span className="text-body font-bold text-ink-800 nums truncate">
                      {formatRupiah(pertemuanTerakhir.saldo_sebelum)}
                    </span>
                  </div>

                  {/* 2. Jumlah Pemasukan Pertemuan Terakhir */}
                  <div className="bg-emerald-50/60 rounded-xl border border-emerald-200/60 p-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-emerald-700">Pemasukan</span>
                    <span className="text-body font-bold text-emerald-700 nums truncate">
                      +{formatRupiah(pertemuanTerakhir.pemasukan)}
                    </span>
                  </div>

                  {/* 3. Jumlah Pengeluaran Pertemuan Terakhir */}
                  <div className="bg-pink-50/60 rounded-xl border border-pink-200/60 p-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] font-medium text-danger">Pengeluaran</span>
                    <span className="text-body font-bold text-danger nums truncate">
                      -{formatRupiah(pertemuanTerakhir.pengeluaran)}
                    </span>
                  </div>

                  {/* 4. Saldo Saat Ini */}
                  <div className="bg-primary-50/60 rounded-xl border border-primary-200/60 p-2.5 flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold text-primary-700">Saldo Saat Ini</span>
                    <span className="text-body font-extrabold text-primary-700 nums truncate">
                      {formatRupiah(pertemuanTerakhir.saldo_saat_ini)}
                    </span>
                  </div>
                </div>

                {/* Breakdown Rincian Pemasukan & Pengeluaran */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-line/60">
                  {/* Rincian Pemasukan */}
                  <div className="rounded-xl bg-emerald-50/50 border border-emerald-100/80 p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-800">
                      <span className="flex items-center gap-1">
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                        Rincian Pemasukan
                      </span>
                      <span className="nums">+{formatRupiah(pertemuanTerakhir.pemasukan)}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {pertemuanTerakhir.rincian_pemasukan && pertemuanTerakhir.rincian_pemasukan.length > 0 ? (
                        pertemuanTerakhir.rincian_pemasukan.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-caption text-ink-700">
                            <span className="text-ink-600 flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">{item.deskripsi}</span>
                            </span>
                            <span className="font-semibold text-ink-900 nums shrink-0 pl-2">
                              {formatRupiah(item.nominal)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-caption text-ink-400 italic">Belum ada pemasukan</span>
                      )}
                    </div>
                  </div>

                  {/* Rincian Pengeluaran */}
                  <div className="rounded-xl bg-pink-50/50 border border-pink-100/80 p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-danger">
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="w-3.5 h-3.5 text-danger" />
                        Rincian Pengeluaran
                      </span>
                      <span className="nums">-{formatRupiah(pertemuanTerakhir.pengeluaran)}</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {pertemuanTerakhir.rincian_pengeluaran && pertemuanTerakhir.rincian_pengeluaran.length > 0 ? (
                        pertemuanTerakhir.rincian_pengeluaran.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between text-caption text-ink-700">
                            <span className="text-ink-600 flex items-center gap-1.5 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                              <span className="truncate">{item.deskripsi}</span>
                            </span>
                            <span className="font-semibold text-danger nums shrink-0 pl-2">
                              -{formatRupiah(item.nominal)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-caption text-ink-400 italic">Belum ada pengeluaran dicatat (Rp 0)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-line/50">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 !h-10 font-bold !bg-emerald-600 hover:!bg-emerald-700 !text-white text-xs"
                    onClick={() => handleOpenRekap(pertemuanTerakhir)}
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1.5" />
                    Bagikan Laporan (WA)
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="!h-10 text-xs font-semibold px-3"
                    onClick={() => router.push(`/pertemuan/${pertemuanTerakhir.id}`)}
                  >
                    Detail
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Visual BarChart Arus Kas */}
      <Section className="pt-0">
        <div className="bg-surface rounded-2xl border border-line/80 shadow-xs p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-body font-bold text-ink-900">Grafik Arus Kas</h2>
              <p className="text-caption text-ink-500">
                {filter === 'bulanan' ? 'Perbandingan per minggu' : 'Tren 7 hari terakhir'}
              </p>
            </div>
            <div className="flex items-center gap-3 text-caption font-medium">
              <span className="flex items-center gap-1.5 text-primary-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary-700" />
                Masuk
              </span>
              <span className="flex items-center gap-1.5 text-pink-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-pink-500" />
                Keluar
              </span>
            </div>
          </div>

          {loading ? (
            <div className="h-[210px] w-full rounded-xl bg-peach-100 animate-pulse flex items-center justify-center text-ink-400 text-caption">
              Memuat grafik...
            </div>
          ) : (
            <div className="pt-2">
              <BarChart
                data={
                  data?.grafik_kas && data.grafik_kas.length > 0
                    ? data.grafik_kas
                    : defaultChartData
                }
                height={210}
              />
            </div>
          )}
        </div>
      </Section>

      {/* Quick Actions (Aksi Cepat) */}
      <Section className="pt-0">
        <QuickActions actions={quickActions} />
      </Section>

      {/* Aktivitas Terbaru */}
      <Section className="pt-0">
        <SectionHeader title="Aktivitas Terbaru" />
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : timelineItems.length === 0 ? (
          <p className="text-body text-ink-400 text-center py-6">Belum ada transaksi</p>
        ) : (
          <Timeline items={timelineItems} />
        )}
      </Section>

      {/* Rekap WhatsApp Sheet */}
      <RekapWhatsAppSheet
        open={rekapSheetOpen}
        onClose={() => setRekapSheetOpen(false)}
        teks={rekapTeks}
      />
    </div>
  );
}
