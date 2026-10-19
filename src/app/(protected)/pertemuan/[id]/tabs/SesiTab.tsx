'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CirclePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Chip } from '@/components/ui/Chip';
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

  return (
    <div className="px-5 py-4">
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
                'rounded-2xl border p-4 shadow-card',
                isDraft
                  ? 'bg-tint-peach border-line ring-1 ring-peach-200'
                  : 'bg-surface border-line',
              ].join(' ')}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <p className="font-semibold text-ink-900 text-base">
                    Sesi {idx + 1}
                  </p>
                  <span className="text-caption font-medium px-2 py-0.5 rounded-md bg-peach-100 text-ink-600 border border-line">
                    Lap. {s.lapangan}
                  </span>
                  {isDraft && (
                    <Badge label="Sedang Main" variant="bermain" />
                  )}
                </div>

                {!terkunci && (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(s.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-caption font-medium text-ink-400 hover:text-danger rounded-lg transition-colors shrink-0"
                    aria-label={`Hapus sesi ${idx + 1}`}
                  >
                    Hapus
                  </button>
                )}
              </div>

              {/* Player Chips */}
              <div className="flex flex-wrap gap-1.5 py-2">
                {s.pemain_ids.map((pid) => (
                  <Chip
                    key={pid}
                    size="sm"
                    label={pemainMap.get(pid) ?? pid.slice(0, 8)}
                    selected={false}
                    disabled
                  />
                ))}
              </div>

              {/* Card Footer */}
              {isDraft ? (
                <div className="space-y-2.5 pt-2.5 border-t border-line">
                  <div className="flex items-center justify-between text-caption">
                    <span className="text-icon-orange font-medium flex items-center gap-1.5">
                      <ShuttlecockIcon size={14} />
                      Menunggu input bola
                    </span>
                    {s.ditanggung_oleh_pemain_id && (
                      <span className="text-primary-700 bg-primary-100 px-2 py-0.5 rounded text-caption font-medium">
                        Ditanggung {pemainMap.get(s.ditanggung_oleh_pemain_id) ?? ''}
                      </span>
                    )}
                  </div>
                  {!terkunci && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setSelesaikanSesi(s)}
                      className="w-full justify-center"
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
