'use client';

import React, { useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Stepper } from '@/components/ui/Stepper';
import { Chip } from '@/components/ui/Chip';
import { Switch } from '@/components/ui/Switch';

interface SesiRow {
  id: string;
  lapangan: number;
  bola_terpakai: number;
  ditanggung_oleh_pemain_id: string | null;
  pemain_ids: string[];
}

interface SelesaikanSesiSheetProps {
  open: boolean;
  onClose: () => void;
  pertemuanId: string;
  sesi: SesiRow | null;
  pemainMap: Map<string, string>;
  onSuccess: () => void;
}

export function SelesaikanSesiSheet({
  open,
  onClose,
  pertemuanId,
  sesi,
  pemainMap,
  onSuccess,
}: SelesaikanSesiSheetProps) {
  const [bola, setBola] = useState(sesi && sesi.bola_terpakai > 0 ? sesi.bola_terpakai : 1);
  const [ditanggung, setDitanggung] = useState(!!sesi?.ditanggung_oleh_pemain_id);
  const [penanggungId, setPenanggungId] = useState<string | null>(sesi?.ditanggung_oleh_pemain_id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevSesiId, setPrevSesiId] = useState(sesi?.id);
  if (sesi && sesi.id !== prevSesiId) {
    setPrevSesiId(sesi.id);
    setBola(sesi.bola_terpakai > 0 ? sesi.bola_terpakai : 1);
    setDitanggung(!!sesi.ditanggung_oleh_pemain_id);
    setPenanggungId(sesi.ditanggung_oleh_pemain_id);
    setError(null);
  }

  if (!sesi) return null;

  const handleSimpan = async () => {
    if (bola < 1) {
      setError('Jumlah bola terpakai minimal 1');
      return;
    }
    if (ditanggung && !penanggungId) {
      setError('Pilih salah satu pemain sebagai penanggung bola');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/sesi/${sesi.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bola_terpakai: bola,
          ditanggung_oleh_pemain_id: ditanggung ? penanggungId : null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(json.message ?? 'Gagal menyelesaikan sesi');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={`Selesaikan Sesi — Lapangan ${sesi.lapangan}`}
    >
      <div className="flex flex-col gap-4">
        {/* Players info */}
        <div>
          <p className="text-caption font-medium text-ink-400 mb-1.5 uppercase tracking-wider">
            Pemain ({sesi.pemain_ids.length} orang)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sesi.pemain_ids.map((id) => (
              <Chip key={id} size="sm" label={pemainMap.get(id) ?? id.slice(0, 8)} disabled />
            ))}
          </div>
        </div>

        {/* Stepper Bola */}
        <Stepper
          label="Bola Terpakai"
          value={bola}
          onChange={setBola}
          min={1}
        />

        {/* Ditanggung toggle */}
        <div
          onClick={() => {
            setDitanggung((v) => {
              const next = !v;
              if (!next) setPenanggungId(null);
              return next;
            });
          }}
          className="flex items-center justify-between w-full h-11 px-3 rounded-lg border border-line bg-peach-100 hover:bg-peach-200 transition-colors cursor-pointer select-none"
        >
          <span className="text-body text-ink-700">Ditanggung seseorang</span>
          <Switch
            checked={ditanggung}
            onChange={(checked) => {
              setDitanggung(checked);
              if (!checked) setPenanggungId(null);
            }}
            aria-label="Ditanggung seseorang"
          />
        </div>

        {ditanggung && (
          <div>
            <p className="text-body font-medium text-ink-700 mb-2">Pilih Penanggung</p>
            <div className="flex flex-wrap gap-1.5">
              {sesi.pemain_ids.map((id) => (
                <Chip
                  key={id}
                  size="sm"
                  label={pemainMap.get(id) ?? id.slice(0, 8)}
                  selected={penanggungId === id}
                  onSelect={() => setPenanggungId(penanggungId === id ? null : id)}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-body text-danger bg-danger-tonal border border-danger/20 rounded-lg p-2.5" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-3 pb-6 mb-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSimpan}
            loading={loading}
            className="flex-1"
          >
            Simpan &amp; Selesai
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
