'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';

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

function getDateString(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTanggal(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '-';
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTanggal, setSelectedTanggal] = useState(getDateString());
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/v1/pertemuan?page=${p}&per_page=20`);
        const json = await res.json();
        if (res.ok) {
          setList(json.data as Pertemuan[]);
          setPagination(json.meta.pagination);
        } else {
          setError(json.message ?? 'Gagal memuat data');
        }
      } catch {
        setError('Terjadi kesalahan jaringan');
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
  }, [page, fetchList]);

  const handleOpenCreateModal = () => {
    setSelectedTanggal(getDateString());
    setCreateModalOpen(true);
  };

  const handleCreate = async () => {
    if (!selectedTanggal) return;
    setCreating(true);
    try {
      const res = await fetch('/api/v1/pertemuan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanggal: selectedTanggal }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Pertemuan berhasil dibuat', 'success');
        setCreateModalOpen(false);
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
    <div className="p-4 pb-28">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Pertemuan</h1>

      <div className="flex flex-col gap-3">
        {loading ? (
          <SkeletonList count={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchList(page)} />
        ) : list.length === 0 ? (
          <EmptyState
            message="Belum ada pertemuan"
            hint="Tekan tombol + untuk membuat pertemuan baru"
          />
        ) : (
          list.map((pt) => (
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
        onClick={handleOpenCreateModal}
        disabled={creating}
        aria-label="Buat pertemuan baru"
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg active:bg-primary-700 disabled:opacity-60"
      >
        <span className="text-2xl leading-none" aria-hidden="true">+</span>
      </button>

      {/* Modal Buat Pertemuan */}
      <BottomSheet
        open={createModalOpen}
        onClose={() => !creating && setCreateModalOpen(false)}
        title="Buat Pertemuan Baru"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Input
              label="Tanggal Pertemuan"
              type="date"
              value={selectedTanggal}
              onChange={(e) => setSelectedTanggal(e.target.value)}
              required
            />
            {/* Quick shortcuts */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedTanggal(getDateString(-1))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTanggal === getDateString(-1)
                    ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => setSelectedTanggal(getDateString(0))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTanggal === getDateString(0)
                    ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setSelectedTanggal(getDateString(1))}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedTanggal === getDateString(1)
                    ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium'
                    : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                Besok
              </button>
            </div>
          </div>

          {/* Formatted date preview */}
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Pilihan:</span>
            <span className="text-sm font-semibold text-neutral-900">
              {formatTanggal(selectedTanggal)}
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleCreate}
              loading={creating}
              disabled={!selectedTanggal}
              className="flex-1"
            >
              Buat Pertemuan
            </Button>
          </div>
        </div>
      </BottomSheet>

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
