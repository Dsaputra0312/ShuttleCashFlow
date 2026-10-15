'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatRupiah } from '@/lib/money';

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
  total_pemasukan: number;
  total_pengeluaran: number;
  filter: Filter;
  tanggal: string;
  transaksi_terbaru: TransaksiItem[];
  ringkasan_pertemuan_terakhir: RingkasanPertemuan | null;
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 animate-pulse">
      <div className="h-3 bg-neutral-200 rounded w-24 mb-2" />
      <div className="h-7 bg-neutral-200 rounded w-32" />
    </div>
  );
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
  const [filter, setFilter] = useState<Filter>('harian');
  const [tanggal, setTanggal] = useState<string>('');
  const [bulan, setBulan] = useState<string>('');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialise dates on client only to avoid Next.js prerender error
  useEffect(() => {
    setTanggal(getTodayWIB());
    setBulan(getCurrentMonthWIB());
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
    fetchDashboard(filter, tanggal, bulan);
  }, [filter, tanggal, bulan, fetchDashboard]);

  return (
    <div className="p-4 pb-24">
      {/* Header */}
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Beranda</h1>

      {/* Filter toggle + date picker */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex bg-neutral-100 rounded-lg p-1">
          {(['harian', 'bulanan'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={[
                'px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize',
                filter === f
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500',
              ].join(' ')}
            >
              {f === 'harian' ? 'Harian' : 'Bulanan'}
            </button>
          ))}
        </div>

        {filter === 'harian' ? (
          <input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        ) : (
          <input
            type="month"
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
              <p className="text-xs text-neutral-500 mb-1">Saldo Kas</p>
              <p className={`text-lg font-bold ${(data?.saldo_kas ?? 0) < 0 ? 'text-danger-700' : 'text-primary-700'}`}>
                {formatRupiah(data?.saldo_kas ?? 0)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
              <p className="text-xs text-neutral-500 mb-1">Stok Bola</p>
              <p className="text-lg font-bold text-neutral-900">
                {data?.stok_bola ?? 0} <span className="text-sm font-normal text-neutral-500">bola</span>
              </p>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
              <p className="text-xs text-neutral-500 mb-1">
                Pemasukan{' '}
                <span className="text-neutral-400">
                  ({filter === 'harian' ? formatTanggalPendek(tanggal) : bulan})
                </span>
              </p>
              <p className="text-lg font-bold text-success-700">
                {formatRupiah(data?.total_pemasukan ?? 0)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
              <p className="text-xs text-neutral-500 mb-1">
                Pengeluaran{' '}
                <span className="text-neutral-400">
                  ({filter === 'harian' ? formatTanggalPendek(tanggal) : bulan})
                </span>
              </p>
              <p className="text-lg font-bold text-danger-700">
                {formatRupiah(data?.total_pengeluaran ?? 0)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Transaksi Terbaru */}
      <h2 className="font-semibold text-neutral-900 mb-3">Transaksi Terbaru</h2>
      {loading ? (
        <div className="flex flex-col gap-2 mb-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-neutral-200 p-3 animate-pulse">
              <div className="h-3 bg-neutral-200 rounded w-40 mb-2" />
              <div className="h-3 bg-neutral-200 rounded w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2 mb-5">
          {(data?.transaksi_terbaru ?? []).length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">Belum ada transaksi</p>
          ) : (
            (data?.transaksi_terbaru ?? []).map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-neutral-200 shadow-sm p-3 flex items-start justify-between gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-700 truncate">{t.keterangan || '—'}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{formatWaktu(t.dibuat_pada)}</p>
                </div>
                <p
                  className={`text-sm font-semibold shrink-0 ${
                    t.tipe === 'pemasukan' ? 'text-success-700' : 'text-danger-700'
                  }`}
                >
                  {t.tipe === 'pemasukan' ? '+' : '-'}{formatRupiah(t.nominal)}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Ringkasan Pertemuan Terakhir */}
      <h2 className="font-semibold text-neutral-900 mb-3">Pertemuan Terakhir</h2>
      {loading ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
          <div className="h-3 bg-neutral-200 rounded w-40 mb-2" />
          <div className="h-3 bg-neutral-200 rounded w-24" />
        </div>
      ) : data?.ringkasan_pertemuan_terakhir ? (
        <Link
          href={`/pertemuan/${data.ringkasan_pertemuan_terakhir.id}`}
          className="block bg-white rounded-xl border border-neutral-200 shadow-sm p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm text-neutral-900">
                {formatTanggalPendek(data.ringkasan_pertemuan_terakhir.tanggal)}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {data.ringkasan_pertemuan_terakhir.jumlah_pemain} pemain
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900">
                {formatRupiah(data.ringkasan_pertemuan_terakhir.total_tagihan)}
              </p>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 ${
                  data.ringkasan_pertemuan_terakhir.terkunci
                    ? 'bg-neutral-100 text-neutral-600'
                    : 'bg-success-50 text-success-700'
                }`}
              >
                {data.ringkasan_pertemuan_terakhir.terkunci ? 'Terkunci' : 'Aktif'}
              </span>
            </div>
          </div>
        </Link>
      ) : (
        <p className="text-sm text-neutral-500 text-center py-4">Belum ada pertemuan</p>
      )}
    </div>
  );
}
