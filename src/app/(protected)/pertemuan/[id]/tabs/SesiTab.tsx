'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { TambahSesiSheet } from '@/components/pertemuan/TambahSesiSheet';

interface Pemain {
  id: string;
  nama: string;
}

interface SesiRow {
  id: string;
  lapangan: number;
  bola_terpakai: number;
  ditanggung_oleh_pemain_id: string | null;
  pemain_ids: string[];
  dibuat_pada: string;
}

interface SesiTabProps {
  pertemuanId: string;
  terkunci: boolean;
  onRefresh?: () => void;
}

export function SesiTab({ pertemuanId, terkunci, onRefresh }: SesiTabProps) {
  const [sesiList, setSesiList] = useState<SesiRow[]>([]);
  const [pemainMap, setPemainMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const fetchSesi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/sesi`);
      const json = await res.json();
      if (res.ok) {
        setSesiList(json.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [pertemuanId]);

  const fetchPemainNames = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/pemain/last-played?n=100`);
      const json = await res.json();
      if (res.ok) {
        const m = new Map<string, string>();
        for (const p of json.data ?? []) {
          m.set((p as Pemain).id, (p as Pemain).nama);
        }
        setPemainMap(m);
      }
    } catch {
      // ignore
    }
  }, [pertemuanId]);

  useEffect(() => {
    fetchSesi();
    fetchPemainNames();
  }, [fetchSesi, fetchPemainNames]);

  const handleDelete = async (sesiId: string) => {
    if (!confirm('Hapus sesi ini?')) return;
    setDeleteLoading(sesiId);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/sesi/${sesiId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchSesi();
        onRefresh?.();
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(null);
    }
  };

  const lastSesi = sesiList.length > 0 ? sesiList[sesiList.length - 1] : null;

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">Memuat sesi...</div>
    );
  }

  return (
    <div className="p-4">
      {sesiList.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-neutral-500 text-sm">Belum ada sesi</p>
          {!terkunci && (
            <p className="text-neutral-400 text-xs mt-1">Tekan + untuk menambah sesi</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {sesiList.map((s, idx) => (
          <div
            key={s.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold text-neutral-900 text-sm">
                  Sesi {idx + 1} — Lapangan {s.lapangan}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {s.bola_terpakai} bola
                  {s.ditanggung_oleh_pemain_id && (
                    <span className="ml-1 text-primary-600">
                      • Ditanggung {pemainMap.get(s.ditanggung_oleh_pemain_id) ?? ''}
                    </span>
                  )}
                </p>
              </div>
              {!terkunci && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(s.id)}
                  loading={deleteLoading === s.id}
                >
                  Hapus
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.pemain_ids.map((pid) => (
                <Chip
                  key={pid}
                  label={pemainMap.get(pid) ?? pid.slice(0, 8)}
                  disabled
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* FAB — only if not locked */}
      {!terkunci && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Tambah sesi"
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg active:bg-primary-700"
        >
          <span className="text-2xl leading-none" aria-hidden="true">+</span>
        </button>
      )}

      <TambahSesiSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        pertemuanId={pertemuanId}
        lastSesi={lastSesi}
        onSuccess={() => {
          fetchSesi();
          onRefresh?.();
        }}
      />
    </div>
  );
}
