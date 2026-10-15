'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';

interface Pemain {
  id: string;
  nama: string;
}

interface SesiData {
  id: string;
  lapangan: number;
  bola_terpakai: number;
  pemain_ids: string[];
  ditanggung_oleh_pemain_id: string | null;
}

interface TambahSesiSheetProps {
  open: boolean;
  onClose: () => void;
  pertemuanId: string;
  lastSesi?: SesiData | null;
  onSuccess: () => void;
}

export function TambahSesiSheet({
  open,
  onClose,
  pertemuanId,
  lastSesi,
  onSuccess,
}: TambahSesiSheetProps) {
  const [lastPlayed, setLastPlayed] = useState<Pemain[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bolaTermakai, setBolaTermakai] = useState(1);
  const [lapangan, setLapangan] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<Pemain | null>(null);
  const [ditanggung, setDitanggung] = useState(false);
  const [penanggungId, setPenanggungId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // All players in the current selection (by ID → name)
  const [pemainMap, setPemainMap] = useState<Map<string, string>>(new Map());

  const fetchLastPlayed = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/pemain/last-played`);
      const json = await res.json();
      if (res.ok) {
        setLastPlayed(json.data ?? []);
        // Populate pemainMap
        const m = new Map<string, string>();
        for (const p of json.data ?? []) {
          m.set(p.id, p.nama);
        }
        setPemainMap(m);
      }
    } catch {
      // ignore
    }
  }, [pertemuanId]);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setBolaTermakai(1);
      setLapangan(1);
      setSearchQuery('');
      setSearchResult(null);
      setDitanggung(false);
      setPenanggungId(null);
      setError(null);
      fetchLastPlayed();
    }
  }, [open, fetchLastPlayed]);

  const handleTogglePlayer = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (penanggungId === id) setPenanggungId(null);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/pemain/quick-add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama: q }),
      });
      const json = await res.json();
      if (res.ok) {
        const p: Pemain = json.data;
        setSearchResult(p);
        // Auto-select
        setSelectedIds((prev) => new Set([...prev, p.id]));
        setPemainMap((prev) => new Map([...prev, [p.id, p.nama]]));
        // Add to lastPlayed if not present
        setLastPlayed((prev) =>
          prev.some((x) => x.id === p.id) ? prev : [p, ...prev]
        );
        setSearchQuery('');
        setSearchResult(null);
      }
    } catch {
      // ignore
    }
  };

  const handleDuplikat = async () => {
    if (!lastSesi) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/pertemuan/${pertemuanId}/sesi/${lastSesi.id}/duplicate`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(json.message ?? 'Gagal menduplikasi sesi');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  const handleSimpan = async () => {
    if (selectedIds.size === 0) {
      setError('Pilih minimal 1 pemain');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/sesi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lapangan,
          bola_terpakai: bolaTermakai,
          pemain_ids: [...selectedIds],
          ditanggung_oleh_pemain_id: ditanggung ? penanggungId : null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError(json.message ?? 'Gagal menyimpan sesi');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlayers = [...selectedIds]
    .map((id) => ({ id, nama: pemainMap.get(id) ?? id }))
    .filter((p) => p.nama);

  return (
    <BottomSheet open={open} onClose={onClose} title="Tambah Sesi">
      <div className="flex flex-col gap-4">
        {/* Quick-select last played */}
        {lastPlayed.length > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Pemain Terakhir</p>
            <div className="flex flex-wrap gap-2">
              {lastPlayed.slice(0, 12).map((p) => (
                <Chip
                  key={p.id}
                  label={p.nama}
                  selected={selectedIds.has(p.id)}
                  onSelect={() => handleTogglePlayer(p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Add by name */}
        <div className="flex gap-2">
          <Input
            placeholder="Cari/tambah pemain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSearch}
            disabled={!searchQuery.trim()}
          >
            +
          </Button>
        </div>

        {searchResult && (
          <p className="text-xs text-success-600">
            Pemain &quot;{searchResult.nama}&quot; ditambahkan
          </p>
        )}

        {/* Selected players summary */}
        {selectedIds.size > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-1">
              Dipilih ({selectedIds.size}):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedPlayers.map((p) => (
                <Chip
                  key={p.id}
                  label={p.nama}
                  selected
                  onSelect={() => handleTogglePlayer(p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bola terpakai stepper */}
        <Stepper
          label="Bola Terpakai"
          value={bolaTermakai}
          onChange={setBolaTermakai}
          min={1}
        />

        {/* Lapangan radio */}
        <div>
          <p className="text-sm font-medium text-neutral-700 mb-2">Lapangan</p>
          <div className="flex gap-3">
            {([1, 2] as const).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setLapangan(num)}
                className={[
                  'flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                  lapangan === num
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-neutral-300 bg-white text-neutral-700',
                ].join(' ')}
                aria-pressed={lapangan === num}
              >
                Lapangan {num}
              </button>
            ))}
          </div>
        </div>

        {/* Ditanggung toggle */}
        <button
          type="button"
          onClick={() => {
            setDitanggung((v) => !v);
            if (ditanggung) setPenanggungId(null);
          }}
          className="flex items-center justify-between w-full h-11 px-3 rounded-lg border border-neutral-200 bg-neutral-50"
          aria-pressed={ditanggung}
        >
          <span className="text-sm text-neutral-700">Ditanggung seseorang</span>
          <span
            className={[
              'relative inline-block w-10 h-6 rounded-full transition-colors',
              ditanggung ? 'bg-primary-600' : 'bg-neutral-300',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                ditanggung ? 'translate-x-4' : 'translate-x-0.5',
              ].join(' ')}
            />
          </span>
        </button>

        {ditanggung && selectedIds.size > 0 && (
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Pilih Penanggung</p>
            <div className="flex flex-wrap gap-2">
              {selectedPlayers.map((p) => (
                <Chip
                  key={p.id}
                  label={p.nama}
                  selected={penanggungId === p.id}
                  onSelect={() => setPenanggungId(penanggungId === p.id ? null : p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          {lastSesi && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleDuplikat}
              loading={loading}
              className="flex-1"
            >
              Duplikat Sesi Sebelumnya
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSimpan}
            loading={loading}
            className="flex-1"
          >
            Simpan
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
