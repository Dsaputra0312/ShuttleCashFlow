'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

interface Pertemuan {
  id: string;
  tanggal: string;
  terkunci: boolean;
  jumlah_sesi?: number;
  jumlah_peserta?: number;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

function formatTanggal(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function PertemuanPageInner() {
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();
  const [list, setList] = useState<Pertemuan[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchList = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/pertemuan?page=${p}&per_page=20`);
        const json = await res.json();
        if (res.ok) {
          setList(json.data as Pertemuan[]);
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
    [addToast]
  );

  useEffect(() => {
    fetchList(page);
  }, [page, fetchList]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/v1/pertemuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Pertemuan berhasil dibuat', 'success');
        router.push(`/pertemuan/${json.data.id}`);
      } else {
        addToast(json.message ?? 'Gagal membuat pertemuan', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Pertemuan</h1>

      <div className="flex flex-col gap-3">
        {loading && (
          <p className="text-neutral-500 text-sm text-center py-4">Memuat...</p>
        )}

        {!loading && list.length === 0 && (
          <div className="text-center py-8">
            <p className="text-neutral-500 text-sm">Belum ada pertemuan</p>
            <p className="text-neutral-400 text-xs mt-1">
              Tekan tombol + untuk membuat pertemuan baru
            </p>
          </div>
        )}

        {list.map((pt) => (
          <button
            key={pt.id}
            type="button"
            onClick={() => router.push(`/pertemuan/${pt.id}`)}
            className="w-full text-left bg-white rounded-xl border border-neutral-200 shadow-sm p-4 min-h-[44px] active:bg-neutral-50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900">
                  {formatTanggal(pt.tanggal)}
                </p>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {pt.jumlah_peserta ?? 0} pemain
                </p>
              </div>
              <Badge
                label={pt.terkunci ? 'Terkunci' : 'Aktif'}
                variant={pt.terkunci ? 'default' : 'success'}
              />
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
        onClick={handleCreate}
        disabled={creating}
        aria-label="Buat pertemuan baru"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg active:bg-primary-700 disabled:opacity-60"
      >
        {creating ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <span className="text-2xl leading-none" aria-hidden="true">+</span>
        )}
      </button>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default function PertemuanPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-neutral-500">Memuat...</div>}>
      <PertemuanPageInner />
    </Suspense>
  );
}
