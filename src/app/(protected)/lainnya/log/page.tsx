'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
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
      setPage(1);
      fetchLogs(search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchLogs]);

  useEffect(() => {
    fetchLogs(search, page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (iso: string) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Log Aktivitas</h1>

      <Input
        placeholder="Cari aksi..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="mt-4 flex flex-col gap-3">
        {loading && <p className="text-neutral-500 text-sm text-center">Memuat...</p>}

        {!loading && logs.length === 0 && (
          <p className="text-neutral-500 text-sm text-center">Belum ada aktivitas</p>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-mono bg-neutral-100 text-neutral-700 rounded px-2 py-0.5 shrink-0">
                {log.aksi}
              </span>
              <span className="text-xs text-neutral-400">{formatDate(log.dibuat_pada)}</span>
            </div>
            <p className="text-sm text-neutral-700 mt-1.5">
              <span className="font-medium">{log.entitas}</span>
              {log.entitas_id && <span className="text-neutral-400"> #{log.entitas_id.slice(0, 8)}</span>}
            </p>
            {log.admin_nama && (
              <p className="text-xs text-neutral-500 mt-1">oleh {log.admin_nama}</p>
            )}
            {log.alasan && (
              <p className="text-xs text-neutral-500 mt-1 italic">Alasan: {log.alasan}</p>
            )}
          </div>
        ))}
      </div>

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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
