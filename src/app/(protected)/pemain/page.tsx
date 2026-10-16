'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { PemainForm, type PemainFormValues } from '@/components/pemain/PemainForm';

interface Pemain {
  id: string;
  nama: string;
  no_hp: string | null;
  catatan: string | null;
  bebas_biaya: boolean;
  aktif: boolean;
  is_member?: boolean;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function PemainPage() {
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();
  const [pemainList, setPemainList] = useState<Pemain[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<PemainFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick Iuran Sheet
  const [iuranSheetOpen, setIuranSheetOpen] = useState(false);
  const [selectedPemainForIuran, setSelectedPemainForIuran] = useState<Pemain | null>(null);
  const [iuranTahun, setIuranTahun] = useState(2026);
  const [iuranBulan, setIuranBulan] = useState(1);
  const [iuranNominal, setIuranNominal] = useState('50000');
  const [iuranLoading, setIuranLoading] = useState(false);
  const [iuranError, setIuranError] = useState<string | null>(null);


  const fetchPemain = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(p),
        per_page: '20',
        ...(q ? { search: q } : {}),
      });
      const res = await fetch(`/api/v1/pemain?${params}`);
      const json = await res.json();
      if (res.ok) {
        setPemainList(json.data as Pemain[]);
        setPagination(json.meta.pagination);
      } else {
        setError(json.message ?? 'Gagal memuat data');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPemain(search, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, fetchPemain]);

  const openAdd = () => {
    setSelected(null);
    setSheetOpen(true);
  };

  const openEdit = (p: Pemain) => {
    setSelected(p);
    setSheetOpen(true);
  };

  const openCatatIuran = async (p: Pemain) => {
    setSelectedPemainForIuran(p);
    const currentDate = new Date();
    setIuranTahun(currentDate.getFullYear());
    setIuranBulan(currentDate.getMonth() + 1);
    setIuranError(null);
    try {
      const confRes = await fetch('/api/v1/konfigurasi');
      const confJson = await confRes.json();
      if (confRes.ok && confJson.data?.iuran_bulanan) {
        setIuranNominal(String(confJson.data.iuran_bulanan));
      } else {
        setIuranNominal('50000');
      }
    } catch {
      setIuranNominal('50000');
    }
    setIuranSheetOpen(true);
  };

  const handleSimpanIuran = async () => {
    if (!selectedPemainForIuran) return;
    const nom = parseInt(iuranNominal, 10);
    if (isNaN(nom) || nom <= 0) {
      setIuranError('Nominal harus lebih dari 0');
      return;
    }
    setIuranLoading(true);
    setIuranError(null);
    try {
      const res = await fetch('/api/v1/iuran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pemain_id: selectedPemainForIuran.id,
          periode_tahun: iuranTahun,
          periode_bulan: iuranBulan,
          nominal: nom,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast(
          `Iuran berhasil dicatat! ${selectedPemainForIuran.nama} kini berstatus Member.`,
          'success'
        );
        setIuranSheetOpen(false);
        fetchPemain(search, page);
      } else {
        setIuranError(json.message ?? 'Gagal mencatat iuran');
      }
    } catch {
      setIuranError('Terjadi kesalahan jaringan');
    } finally {
      setIuranLoading(false);
    }
  };

  const handleSuccess = () => {
    addToast(selected ? 'Pemain berhasil diperbarui' : 'Pemain berhasil ditambahkan', 'success');
    fetchPemain(search, page);
  };

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Pemain</h1>

      <Input
        placeholder="Cari nama pemain..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <div className="mt-4 flex flex-col gap-3">
        {loading ? (
          <SkeletonList count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchPemain(search, page)} />
        ) : pemainList.length === 0 ? (
          <EmptyState message="Belum ada pemain" hint="Tekan tombol + untuk menambah pemain" />
        ) : (
          pemainList.map((p) => (
          <div
            key={p.id}
            className="w-full bg-white rounded-xl border border-neutral-200 shadow-sm p-4 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => router.push(`/pemain/${p.id}`)}
              >
                <p className="font-semibold text-neutral-900 truncate hover:text-primary-600 transition-colors">
                  {p.nama}
                </p>
                {p.no_hp && (
                  <p className="text-sm text-neutral-500 mt-0.5">{p.no_hp}</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                <Badge
                  label={p.is_member ? 'Member' : 'Non-Member'}
                  variant={p.is_member ? 'success' : 'default'}
                />
                {p.bebas_biaya && <Badge label="Bebas Biaya" variant="info" />}
                <Badge
                  label={p.aktif ? 'Aktif' : 'Nonaktif'}
                  variant={p.aktif ? 'success' : 'default'}
                />
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => router.push(`/pemain/${p.id}`)}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 py-1 transition-colors"
              >
                Detail & Riwayat Iuran →
              </button>
              <div className="flex items-center gap-1.5">
                {!p.is_member && (
                  <button
                    type="button"
                    onClick={() => openCatatIuran(p)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 transition-colors"
                  >
                    + Bayar Iuran
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))
      )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-neutral-500">
            {page} / {pagination.total_pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}

      {/* FAB */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Tambah pemain"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg active:bg-primary-700"
      >
        <span className="text-2xl leading-none" aria-hidden="true">+</span>
      </button>

      {/* Edit Form */}
      <PemainForm
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={selected}
        onSuccess={handleSuccess}
      />

      {/* Quick Iuran Sheet */}
      <BottomSheet
        open={iuranSheetOpen}
        onClose={() => setIuranSheetOpen(false)}
        title={`Catat Iuran — ${selectedPemainForIuran?.nama ?? ''}`}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3">
            <p className="text-xs text-emerald-800">
              Setelah iuran dicatat, status <strong>{selectedPemainForIuran?.nama}</strong> otomatis menjadi <strong>Member</strong> untuk periode bulan ini dan bebas biaya sewa lapangan.
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-neutral-700">Tahun</label>
              <input
                type="number"
                value={iuranTahun}
                onChange={(e) => setIuranTahun(parseInt(e.target.value, 10))}
                min={2020}
                max={2100}
                className="h-11 rounded-lg border border-neutral-300 px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-neutral-700">Bulan</label>
              <select
                value={iuranBulan}
                onChange={(e) => setIuranBulan(parseInt(e.target.value, 10))}
                className="h-11 rounded-lg border border-neutral-300 px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {BULAN.map((nama, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Nominal (Rp)"
            type="number"
            value={iuranNominal}
            onChange={(e) => setIuranNominal(e.target.value)}
            min={1}
            placeholder="50000"
          />

          {iuranError && (
            <p className="text-sm text-danger-600" role="alert">
              {iuranError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIuranSheetOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSimpanIuran}
              loading={iuranLoading}
              className="flex-1"
            >
              Simpan Iuran
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
