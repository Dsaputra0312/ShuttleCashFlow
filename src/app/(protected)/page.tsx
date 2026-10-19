'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Wallet, CalendarDays, Users, ShoppingBag } from 'lucide-react';
import { formatRupiah } from '@/lib/money';
import { HeroCard } from '@/components/ui/HeroCard';
import { SelectorCard } from '@/components/ui/SelectorCard';
import { QuickActions } from '@/components/ui/QuickActions';
import { FeatureCard } from '@/components/ui/FeatureCard';
import { Section } from '@/components/ui/Section';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Timeline } from '@/components/ui/Timeline';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { ShuttlecockIcon } from '@/components/ui/ShuttlecockIcon';

type Filter = 'harian' | 'bulanan';

interface TransaksiItem {
  id: string;
  tipe: 'pemasukan' | 'pengeluaran';
  nominal: number;
  keterangan: string;
  dibuat_pada: string;
}

interface RingkasanPertemuan {
  id: string;
  tanggal: string;
  terkunci: boolean;
  jumlah_pemain: number;
  total_tagihan: number;
}

interface DashboardData {
  saldo_kas: number;
  stok_bola: number;
  stok_bola_formatted?: string;
  total_pemasukan: number;
  total_pengeluaran: number;
  filter: Filter;
  tanggal: string;
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
      label: 'Buat Pertemuan',
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

  const featureItems: Parameters<typeof FeatureCard>[0]['items'] = [
    {
      tint: 'orange',
      icon: CalendarDays,
      label: 'Pertemuan',
      description: 'Kelola sesi main',
      href: '/pertemuan',
    },
    {
      tint: 'lavender',
      icon: Users,
      label: 'Pemain',
      description: 'Data anggota grup',
      href: '/pemain',
    },
    {
      tint: 'mint',
      icon: Wallet,
      label: 'Kas',
      description: 'Pemasukan & pengeluaran',
      href: '/kas',
    },
    {
      tint: 'peach',
      icon: ShoppingBag,
      label: 'Stok Bola',
      description: 'Kelola shuttlecock',
      href: '/lainnya/stok',
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

  return (
    <div>
      {/* Selector Card — grup info */}
      <Section>
        <SelectorCard
          name="ShuttleCashFlow"
          subtitle={
            pertemuanTerakhir
              ? `Pertemuan terakhir: ${formatTanggalPendek(pertemuanTerakhir.tanggal)}`
              : 'Belum ada pertemuan'
          }
          badge={
            pertemuanTerakhir ? (
              <Badge
                label={pertemuanTerakhir.terkunci ? 'Terkunci' : 'Aktif'}
                variant={pertemuanTerakhir.terkunci ? 'terkunci' : 'aktif'}
              />
            ) : undefined
          }
          onClick={
            pertemuanTerakhir
              ? () => router.push(`/pertemuan/${pertemuanTerakhir.id}`)
              : undefined
          }
        />
      </Section>

      {/* Filter toggle + date picker */}
      <Section className="pt-0">
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

      {/* Quick Actions */}
      <Section className="pt-0">
        <QuickActions actions={quickActions} />
      </Section>

      {/* Feature Cards 2×2 */}
      <Section className="pt-0">
        <FeatureCard items={featureItems} />
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
    </div>
  );
}
