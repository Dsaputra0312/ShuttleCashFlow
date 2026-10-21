'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { ShuttlecockIcon } from '@/components/ui/ShuttlecockIcon';
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
      <div className="px-5 py-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  const totalBola = sesiList.reduce((acc, s) => acc + (s.bola_terpakai || 0), 0);
  const activeDrafts = sesiList.filter((s) => s.bola_terpakai === 0);

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      {/* Realtime Session & Shuttlecock Indicator */}
      {sesiList.length > 0 && (
        <div className="bg-surface rounded-2xl border border-line p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700">
              <ShuttlecockIcon size={20} />
            </div>
            <div>
              <p className="text-body font-bold text-ink-900 leading-tight">
                {totalBola} Shuttlecock
              </p>
              <p className="text-caption text-ink-500 mt-0.5">
                Total terpakai dari {sesiList.length} sesi
              </p>
            </div>
          </div>

          <div className="text-right">
            {activeDrafts.length > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-caption font-bold bg-amber-50 text-amber-800 border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                {activeDrafts.length} Main
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 text-center">
                Semua Selesai
              </span>
            )}
          </div>
        </div>
      )}

      {sesiList.length === 0 && (
        <EmptyState
          message="Belum ada sesi"
          hint={!terkunci ? 'Tekan + untuk menambah sesi' : undefined}
        />
      )}

      <div className="flex flex-col gap-3">
        {sesiList.map((s, idx) => {
          const isDraft = s.bola_terpakai === 0;
          return (
            <div
              key={s.id}
              className={[
                'rounded-2xl p-4 transition-all',
                isDraft
                  ? 'bg-surface border-2 border-amber-400 shadow-card ring-2 ring-amber-400/15'
                  : 'bg-surface border border-line shadow-xs',
              ].join(' ')}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <p className="font-semibold text-ink-900 text-base">
                    Sesi {idx + 1}
                  </p>
                  <span className="text-caption font-medium px-2 py-0.5 rounded-md bg-peach-100 text-ink-700 border border-line">
                    Lap. {s.lapangan}
                  </span>
                  {isDraft && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-caption font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Sedang Main
                    </span>
                  )}
                </div>

                {!terkunci && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-caption font-semibold text-danger/80 hover:text-danger hover:bg-danger-surface rounded-lg transition-colors shrink-0"
                    aria-label={`Hapus sesi ${idx + 1}`}
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Player Tags — High contrast and clearly readable */}
              <div className="flex flex-wrap gap-1.5 py-2">
                {s.pemain_ids.map((pid) => (
                  <span
                    key={pid}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-caption font-semibold bg-peach-100 text-ink-900 border border-line"
                  >
                    {pemainMap.get(pid) ?? pid.slice(0, 8)}
                  </span>
                ))}
              </div>

              {/* Card Footer */}
              {isDraft ? (
                <div className="space-y-2.5 pt-2.5 border-t border-line/80">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                      <ShuttlecockIcon size={14} />
                      Menunggu input bola
                    </span>
                    {s.ditanggung_oleh_pemain_id && (
                      <span className="text-primary-700 bg-primary-100 px-2 py-0.5 rounded text-caption font-semibold">
                        Ditanggung {pemainMap.get(s.ditanggung_oleh_pemain_id) ?? ''}
                      </span>
                    )}
                  </div>
                  {!terkunci && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setSelesaikanSesi(s)}
                      className="w-full justify-center !h-10 text-body font-bold shadow-xs"
                    >
                      Input Bola &amp; Selesai
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-caption pt-2.5 border-t border-line text-ink-600">
                  <span className="font-medium flex items-center gap-1.5">
                    <ShuttlecockIcon size={14} />
                    {s.bola_terpakai} bola terpakai
                  </span>
                  {s.ditanggung_oleh_pemain_id && (
                    <span className="text-primary-700 bg-primary-100 px-2 py-0.5 rounded text-caption font-medium">
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
        <IconButton
          icon={CirclePlus}
          label="Tambah sesi"
          variant="filled"
          size="lg"
          onClick={() => setSheetOpen(true)}
          className="fixed bottom-[120px] right-4 z-30 shadow-float"
        />
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        title="Hapus Sesi"
        description="Apakah Anda yakin ingin menghapus sesi ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Sesi"
        destructive
        loading={!!deleteLoading}
      />

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
