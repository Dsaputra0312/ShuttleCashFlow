'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { formatRupiah } from '@/lib/money';

interface Transaksi {
  id: string;
  nominal: number;
  tipe: 'pemasukan' | 'pengeluaran';
  keterangan: string;
  dapat_diubah: boolean;
  dibuat_pada: string;
  kategori_id: string | null;
  kategori_nama?: string | null;
}

interface Kategori {
  id: string;
  nama: string;
  tipe: 'pemasukan' | 'pengeluaran';
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export default function KasPage() {
  const { toasts, addToast, dismiss } = useToast();
  const [list, setList] = useState<Transaksi[]>([]);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterTipe, setFilterTipe] = useState<'pemasukan' | 'pengeluaran' | ''>('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterBulan, setFilterBulan] = useState(''); // YYYY-MM

  // Add sheet
  const [addOpen, setAddOpen] = useState(false);
  const [addTipe, setAddTipe] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [addNominal, setAddNominal] = useState('');
  const [addKategori, setAddKategori] = useState('');
  const [addKeterangan, setAddKeterangan] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchKategori = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/kategori-kas?per_page=100');
      const json = await res.json();
      if (res.ok) setKategoriList(json.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  const fetchList = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          per_page: '20',
          ...(filterTipe ? { tipe: filterTipe } : {}),
          ...(filterKategori ? { kategori_id: filterKategori } : {}),
          ...(filterBulan ? { bulan: filterBulan } : {}),
        });
        const res = await fetch(`/api/v1/kas?${params}`);
        const json = await res.json();
        if (res.ok) {
          setList(json.data ?? []);
          setPagination(json.meta.pagination);
        } else {
          addToast(json.message ?? 'Gagal memuat data', 'error');
        }
      } catch {
        addToast('Terjadi kesalahan jaringan', 'error');
      } finally {
        setLoading(false);
      }
    },
    [filterTipe, filterKategori, filterBulan, addToast]
  );

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchKategori();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchKategori]);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchList(page);
      }
    });
    return () => {
      ignore = true;
    };
  }, [page, filterTipe, filterKategori, filterBulan, fetchList]);

  const openAdd = (tipe: 'pemasukan' | 'pengeluaran') => {
    setAddTipe(tipe);
    setAddNominal('');
    setAddKategori('');
    setAddKeterangan('');
    setAddError(null);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    const nominal = parseInt(addNominal, 10);
    if (isNaN(nominal) || nominal <= 0) {
      setAddError('Nominal harus lebih dari 0');
      return;
    }
    if (!addKategori) {
      setAddError('Pilih kategori');
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch('/api/v1/kas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal,
          tipe: addTipe,
          kategori_id: addKategori,
          keterangan: addKeterangan,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Transaksi berhasil dicatat', 'success');
        setAddOpen(false);
        fetchList(page);
      } else {
        setAddError(json.message ?? 'Gagal');
      }
    } catch {
      setAddError('Terjadi kesalahan jaringan');
    } finally {
      setAddLoading(false);
    }
  };

  const filteredKategori = kategoriList.filter((k) => k.tipe === addTipe);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Kas</h1>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          {(['', 'pemasukan', 'pengeluaran'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setFilterTipe(t);
                setPage(1);
              }}
              className={[
                'flex-1 h-9 rounded-lg border text-sm font-medium transition-colors',
                filterTipe === t
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 bg-white text-neutral-600',
              ].join(' ')}
            >
              {t === '' ? 'Semua' : t === 'pemasukan' ? 'Masuk' : 'Keluar'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={filterBulan}
            onChange={(e) => {
              setFilterBulan(e.target.value);
              setPage(1);
            }}
            className="flex-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={filterKategori}
            onChange={(e) => {
              setFilterKategori(e.target.value);
              setPage(1);
            }}
            className="flex-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Semua Kategori</option>
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading && <SkeletonList count={4} />}

      {!loading && list.length === 0 && (
        <EmptyState
          message="Belum ada transaksi"
          hint="Transaksi kas akan muncul di sini"
        />
      )}

      <div className="flex flex-col gap-2">
        {list.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 bg-white rounded-xl border border-neutral-200 shadow-sm p-3"
          >
            <Badge
              label={t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
              variant={t.tipe === 'pemasukan' ? 'success' : 'danger'}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-neutral-900">
                {formatRupiah(t.nominal)}
              </p>
              {t.keterangan && (
                <p className="text-xs text-neutral-500 mt-0.5 truncate">{t.keterangan}</p>
              )}
              {t.kategori_nama && (
                <p className="text-xs text-neutral-400">{t.kategori_nama}</p>
              )}
            </div>
            <p className="text-xs text-neutral-400 shrink-0">
              {new Date(t.dibuat_pada).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              })}
            </p>
          </div>
        ))}
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

      {/* FAB — two buttons */}
      <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => openAdd('pengeluaran')}
          aria-label="Tambah pengeluaran"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-600 text-white shadow-lg active:bg-danger-700 text-xs font-bold"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => openAdd('pemasukan')}
          aria-label="Tambah pemasukan"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg active:bg-primary-700 text-2xl font-bold"
        >
          +
        </button>
      </div>

      {/* Add sheet */}
      <BottomSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={addTipe === 'pemasukan' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nominal"
            type="number"
            value={addNominal}
            onChange={(e) => setAddNominal(e.target.value)}
            min={1}
            placeholder="0"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Kategori</label>
            <select
              value={addKategori}
              onChange={(e) => setAddKategori(e.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Pilih Kategori</option>
              {filteredKategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Keterangan (opsional)"
            value={addKeterangan}
            onChange={(e) => setAddKeterangan(e.target.value)}
            placeholder="Deskripsi transaksi"
          />

          {addError && (
            <p className="text-sm text-danger-600" role="alert">
              {addError}
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleAdd} loading={addLoading} className="flex-1">
              Simpan
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
