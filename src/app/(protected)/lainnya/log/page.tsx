'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Timeline } from '@/components/ui/Timeline';
import { SearchField } from '@/components/ui/SearchField';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

interface LogEntry {
  id: string;
  aksi: string;
  entitas: string;
  entitas_id: string | null;
  alasan: string | null;
  dibuat_pada: string;
  admin_id: string | null;
  admin_nama: string | null;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export default function LogPage() {
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        per_page: '20',
        ...(q ? { search: q } : {}),
      });
      const res = await fetch(`/api/v1/log?${params}`);
      const json = await res.json();
      if (res.ok) {
        setLogs(json.data as LogEntry[]);
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
      fetchLogs(search, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, fetchLogs]);

  const formatDate = (iso: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  };

  const timelineItems = logs.map((log) => ({
    time: formatDate(log.dibuat_pada),
    content: (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-caption font-mono bg-peach-100 text-ink-900 rounded px-2 py-0.5 font-medium">
            {log.aksi}
          </span>
          <span className="font-heading text-caption text-ink-900">
            {log.entitas}
            {log.entitas_id && (
              <span className="text-ink-400 font-normal"> #{log.entitas_id.slice(0, 8)}</span>
            )}
          </span>
        </div>
        {log.admin_nama && (
          <p className="text-caption text-ink-600">oleh {log.admin_nama}</p>
        )}
        {log.alasan && (
          <p className="text-caption text-ink-600 italic">Alasan: {log.alasan}</p>
        )}
      </div>
    ),
  }));

  return (
    <div>
      <PageHeader
        title="Log Aktivitas"
        onBack={() => router.push('/lainnya')}
      />

      <div className="p-4 max-w-xl mx-auto">
        <SearchField
          placeholder="Cari aksi..."
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
        />

        <div className="mt-4 flex flex-col gap-3">
          {loading && <SkeletonList count={4} />}

          {!loading && logs.length === 0 && (
            <EmptyState
              message="Belum ada aktivitas"
              hint="Aktivitas admin akan dicatat secara otomatis di sini"
            />
          )}

          {!loading && timelineItems.length > 0 && (
            <Card padding className="mt-2">
              <Timeline items={timelineItems} />
            </Card>
          )}
        </div>

        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              variant="tonal"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <span className="text-caption text-ink-600">
              {page} / {pagination.total_pages}
            </span>
            <Button
              variant="tonal"
              size="sm"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        )}

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  );
}
