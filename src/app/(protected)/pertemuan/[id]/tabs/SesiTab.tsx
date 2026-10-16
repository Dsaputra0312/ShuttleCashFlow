'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { TambahSesiSheet } from '@/components/pertemuan/TambahSesiSheet';
import { SelesaikanSesiSheet } from '@/components/pertemuan/SelesaikanSesiSheet';

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
  const [selesaikanSesi, setSelesaikanSesi] = useState<SesiRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      // First try rekomendasi endpoint for all players in group
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/pemain/rekomendasi`);
      const json = await res.json();
      if (res.ok && json.data?.all_pemain) {
        const m = new Map<string, string>();
        for (const p of json.data.all_pemain) {
          m.set((p as Pemain).id, (p as Pemain).nama);
        }
        setPemainMap(m);
        return;
      }
      // Fallback to last-played
      const resLast = await fetch(`/api/v1/pertemuan/${pertemuanId}/pemain/last-played?n=100`);
      const jsonLast = await resLast.json();
      if (resLast.ok) {
        const m = new Map<string, string>();
        for (const p of jsonLast.data ?? []) {
          m.set((p as Pemain).id, (p as Pemain).nama);
        }
        setPemainMap(m);
      }
    } catch {
      // ignore
    }
  }, [pertemuanId]);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchSesi();
        fetchPemainNames();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchSesi, fetchPemainNames]);

  const handleDelete = async (sesiId: string) => {
    setDeleteLoading(sesiId);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/sesi/${sesiId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setConfirmDeleteId(null);
        fetchSesi();
        onRefresh?.();
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="p-4">
      {sesiList.length === 0 && (
        <EmptyState
          message="Belum ada sesi"
          hint={!terkunci ? "Tekan + untuk menambah sesi" : undefined}
        />
      )}

      <div className="flex flex-col gap-3">
        {sesiList.map((s, idx) => {
          const isDraft = s.bola_terpakai === 0;
          return (
            <div
              key={s.id}
              className={[
                'rounded-2xl border p-4 transition-all shadow-xs',
                isDraft
                  ? 'bg-amber-50/30 border-amber-300 ring-1 ring-amber-200/70'
                  : 'bg-white border-neutral-200/90 hover:border-neutral-300',
              ].join(' ')}
            >
              {/* Card Header: Sesi, Court, Status, and Delete */}
              <div className="flex items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <p className="font-bold text-neutral-900 text-base">
                    Sesi {idx + 1}
                  </p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200/70">
                    Lap. {s.lapangan}
                  </span>
                  {isDraft && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Sedang Main
                    </span>
                  )}
                </div>

                {!terkunci && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors shrink-0"
                    aria-label={`Hapus sesi ${idx + 1}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              {/* Player Chips */}
              <div className="flex flex-wrap gap-1.5 py-2">
                {s.pemain_ids.map((pid) => (
                  <span
                    key={pid}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200/60"
                  >
                    {pemainMap.get(pid) ?? pid.slice(0, 8)}
                  </span>
                ))}
              </div>

              {/* Card Footer: Status & Actions */}
              {isDraft ? (
                <div className="space-y-2.5 pt-2.5 border-t border-amber-200/60">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-800 font-medium flex items-center gap-1.5">
                      🏸 Menunggu input bola
                    </span>
                    {s.ditanggung_oleh_pemain_id && (
                      <span className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-[11px] font-medium border border-primary-200">
                        Ditanggung {pemainMap.get(s.ditanggung_oleh_pemain_id) ?? ''}
                      </span>
                    )}
                  </div>
                  {!terkunci && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setSelesaikanSesi(s)}
                      className="w-full justify-center h-10 font-semibold shadow-xs"
                    >
                      Input Bola & Selesai
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs pt-2.5 border-t border-neutral-100 text-neutral-600">
                  <span className="font-medium flex items-center gap-1.5">
                    🏸 {s.bola_terpakai} bola terpakai
                  </span>
                  {s.ditanggung_oleh_pemain_id && (
                    <span className="text-primary-700 bg-primary-50 px-2 py-0.5 rounded text-[11px] font-medium border border-primary-200">
                      Ditanggung {pemainMap.get(s.ditanggung_oleh_pemain_id) ?? ''}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
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

      {/* Selesaikan Sesi Sheet (Input Bola) */}
      <SelesaikanSesiSheet
        open={!!selesaikanSesi}
        onClose={() => setSelesaikanSesi(null)}
        pertemuanId={pertemuanId}
        sesi={selesaikanSesi}
        pemainMap={pemainMap}
        onSuccess={() => {
          fetchSesi();
          onRefresh?.();
        }}
      />

      {/* Delete Confirmation Sheet */}
      <BottomSheet
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        title="Hapus Sesi"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-neutral-600">
            Apakah Anda yakin ingin menghapus sesi ini? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex gap-2 pb-4">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmDeleteId(null)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={!!deleteLoading}
              onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
            >
              Hapus Sesi
            </Button>
          </div>
        </div>
      </BottomSheet>

      <TambahSesiSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        pertemuanId={pertemuanId}
        onSuccess={() => {
          fetchSesi();
          fetchPemainNames();
          onRefresh?.();
        }}
      />
    </div>
  );
}
