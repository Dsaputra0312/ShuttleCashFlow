'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export default function PemainPage() {
  const { toasts, addToast, dismiss } = useToast();
  const [pemainList, setPemainList] = useState<Pemain[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<PemainFormValues | null>(null);

  const fetchPemain = useCallback(async (q: string, p: number) => {
    setLoading(true);
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
        addToast(json.message ?? 'Gagal memuat data', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPemain(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchPemain]);

  useEffect(() => {
    fetchPemain(search, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const openAdd = () => {
    setSelected(null);
    setSheetOpen(true);
  };

  const openEdit = (p: Pemain) => {
    setSelected(p);
    setSheetOpen(true);
  };

  const handleSuccess = () => {
    addToast(selected ? 'Pemain berhasil diperbarui' : 'Pemain berhasil ditambahkan', 'success');
    fetchPemain(search, page);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Pemain</h1>

      <Input
        placeholder="Cari nama pemain..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-4 flex flex-col gap-3">
        {loading && <p className="text-neutral-500 text-sm text-center">Memuat...</p>}

        {!loading && pemainList.length === 0 && (
          <p className="text-neutral-500 text-sm text-center">Belum ada pemain</p>
        )}

        {pemainList.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => openEdit(p)}
            className="w-full text-left bg-white rounded-xl border border-neutral-200 shadow-sm p-4 min-h-[44px]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{p.nama}</p>
                {p.no_hp && (
                  <p className="text-sm text-neutral-500 mt-0.5">{p.no_hp}</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                {p.bebas_biaya && <Badge label="Bebas Biaya" variant="info" />}
                <Badge
                  label={p.aktif ? 'Aktif' : 'Nonaktif'}
                  variant={p.aktif ? 'success' : 'default'}
                />
              </div>
            </div>
          </button>
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

      {/* FAB */}
      <button
        type="button"
        onClick={openAdd}
        aria-label="Tambah pemain"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg active:bg-primary-700"
      >
        <span className="text-2xl leading-none" aria-hidden="true">+</span>
      </button>

      <PemainForm
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={selected}
        onSuccess={handleSuccess}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
