'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, CirclePlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListRow } from '@/components/ui/ListRow';
import { IconTile } from '@/components/ui/IconTile';
import { IconButton } from '@/components/ui/IconButton';
import { Chip } from '@/components/ui/Chip';

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
    <div>
      <PageHeader title="Pertemuan" />

      <div className="px-5 py-4">
        <div className="flex flex-col gap-2">
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
              <ListRow
                key={pt.id}
                left={<IconTile tint="orange" icon={CalendarDays} size={40} />}
                title={formatTanggal(pt.tanggal)}
                subtitle={`${pt.jumlah_peserta ?? 0} pemain`}
                right={
                  <Badge
                    label={pt.terkunci ? 'Terkunci' : 'Aktif'}
                    variant={pt.terkunci ? 'terkunci' : 'aktif'}
                  />
                }
                onPress={() => router.push(`/pertemuan/${pt.id}`)}
              />
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
            <span className="text-body text-ink-400">
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
      </div>

      {/* FAB */}
      <IconButton
        icon={CirclePlus}
        label="Buat pertemuan baru"
        variant="filled"
        size="lg"
        onClick={handleOpenCreateModal}
        disabled={creating}
        className="fixed bottom-[120px] right-4 z-30 shadow-float"
      />

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
              <Chip
                size="sm"
                label="Kemarin"
                selected={selectedTanggal === getDateString(-1)}
                onSelect={() => setSelectedTanggal(getDateString(-1))}
              />
              <Chip
                size="sm"
                label="Hari Ini"
                selected={selectedTanggal === getDateString(0)}
                onSelect={() => setSelectedTanggal(getDateString(0))}
              />
              <Chip
                size="sm"
                label="Besok"
                selected={selectedTanggal === getDateString(1)}
                onSelect={() => setSelectedTanggal(getDateString(1))}
              />
            </div>
          </div>

          {/* Formatted date preview */}
          <div className="p-3 bg-peach-100 rounded-xl border border-line flex items-center justify-between">
            <span className="text-caption text-ink-600">Pilihan:</span>
            <span className="text-body font-medium text-ink-900">
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
    <Suspense fallback={<div className="px-5 py-4 text-center text-body text-ink-400">Memuat...</div>}>
      <PertemuanPageInner />
    </Suspense>
  );
}
