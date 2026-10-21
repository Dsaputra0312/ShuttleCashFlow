'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { Switch } from '@/components/ui/Switch';
import { SearchField } from '@/components/ui/SearchField';
import { X } from 'lucide-react';

interface Pemain {
  id: string;
  nama: string;
  sesi_count?: number;
}

interface TambahSesiSheetProps {
  open: boolean;
  onClose: () => void;
  pertemuanId: string;
  onSuccess: () => void;
}

export function TambahSesiSheet({
  open,
  onClose,
  pertemuanId,
  onSuccess,
}: TambahSesiSheetProps) {
  const [rekomendasi, setRekomendasi] = useState<Pemain[]>([]);
  const [allPemain, setAllPemain] = useState<Pemain[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDraft, setIsDraft] = useState(false);
  const [bolaTermakai, setBolaTermakai] = useState(1);
  const [lapangan, setLapangan] = useState<number>(1);
  const [isCustomLapangan, setIsCustomLapangan] = useState(false);
  const [customLapanganInput, setCustomLapanganInput] = useState('3');
  const [searchQuery, setSearchQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ditanggung, setDitanggung] = useState(false);
  const [penanggungId, setPenanggungId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pemainMap, setPemainMap] = useState<Map<string, string>>(new Map());
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelectedIds(new Set());
      setIsDraft(false);
      setBolaTermakai(1);
      setLapangan(1);
      setIsCustomLapangan(false);
      setCustomLapanganInput('3');
      setSearchQuery('');
      setDropdownOpen(false);
      setDitanggung(false);
      setPenanggungId(null);
      setError(null);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch recommendations and group players
  useEffect(() => {
    let ignore = false;
    if (open) {
      void (async () => {
        try {
          const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/pemain/rekomendasi`);
          const json = await res.json();
          if (res.ok && !ignore) {
            const data = json.data;
            setRekomendasi(data.rekomendasi ?? []);
            setAllPemain(data.all_pemain ?? []);

            const m = new Map<string, string>();
            for (const p of data.all_pemain ?? []) {
              m.set(p.id, p.nama);
            }
            setPemainMap(m);
          }
        } catch {
          // ignore
        }
      })();
    }
    return () => {
      ignore = true;
    };
  }, [open, pertemuanId]);

  const handleTogglePlayer = (id: string) => {
    setError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (penanggungId === id) setPenanggungId(null);
      } else {
        if (next.size >= 4) {
          setError('Maksimal permainan dalam 1 sesi 4 orang');
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectFromDropdown = (p: Pemain) => {
    if (selectedIds.has(p.id)) {
      handleTogglePlayer(p.id);
    } else {
      if (selectedIds.size >= 4) {
        setError('Maksimal permainan dalam 1 sesi 4 orang');
        return;
      }
      setSelectedIds((prev) => new Set([...prev, p.id]));
      setPemainMap((prev) => new Map([...prev, [p.id, p.nama]]));
      setError(null);
    }
    setSearchQuery('');
    setDropdownOpen(false);
  };

  const handleQuickAdd = async (nama: string) => {
    const q = nama.trim();
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
        setPemainMap((prev) => new Map([...prev, [p.id, p.nama]]));
        setAllPemain((prev) => [...prev, p]);

        if (selectedIds.size >= 4) {
          setError('Pemain ditambahkan ke grup, tetapi sesi sudah maksimal 4 orang');
        } else {
          setSelectedIds((prev) => new Set([...prev, p.id]));
          setError(null);
        }
        setSearchQuery('');
        setDropdownOpen(false);
      } else {
        setError(json.message ?? 'Gagal menambahkan pemain');
      }
    } catch {
      setError('Gagal menambahkan pemain');
    }
  };

  const handleSimpan = async () => {
    if (selectedIds.size === 0) {
      setError('Pilih minimal 1 pemain');
      return;
    }
    if (selectedIds.size > 4) {
      setError('Maksimal permainan dalam 1 sesi 4 orang');
      return;
    }
    if (ditanggung && !penanggungId) {
      setError('Pilih salah satu pemain sebagai penanggung bola');
      return;
    }

    const finalLapangan = isCustomLapangan
      ? Math.max(1, parseInt(customLapanganInput, 10) || 1)
      : lapangan;

    const finalBola = isDraft ? 0 : bolaTermakai;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/sesi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lapangan: finalLapangan,
          bola_terpakai: finalBola,
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

  // Recommendations only for players who are NOT yet selected
  const unselectedRekomendasi = rekomendasi.filter((p) => !selectedIds.has(p.id));

  const queryTrimmed = searchQuery.trim().toLowerCase();
  const filteredDropdownPlayers = allPemain.filter((p) =>
    p.nama.toLowerCase().includes(queryTrimmed)
  );
  const exactMatchExists = allPemain.some(
    (p) => p.nama.trim().toLowerCase() === queryTrimmed
  );

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Tambah Sesi"
      stickyBottom={
        <div className="flex flex-col gap-2">
          {error && (
            <p className="text-caption text-danger bg-danger-tonal border border-danger/20 rounded-lg p-2.5" role="alert">
              {error}
            </p>
          )}
          <Button
            type="button"
            onClick={handleSimpan}
            loading={loading}
            className="w-full !h-12 text-body font-bold shadow-card"
          >
            {isDraft ? 'Simpan Draft (Mulai Main)' : 'Simpan Sesi'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 pb-2">
        {/* 1. Pemain Dipilih & Rekomendasi Terpadu */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-caption font-bold text-ink-900 uppercase tracking-wider">
              Pemain Sesi ({selectedIds.size}/4)
            </span>
            {selectedIds.size === 4 ? (
              <span className="text-caption font-semibold text-icon-mint bg-tint-mint px-2 py-0.5 rounded-full">
                Slot Penuh (4/4)
              </span>
            ) : (
              <span className="text-caption text-ink-400">
                Pilih 2–4 pemain
              </span>
            )}
          </div>

          {/* Slot Pemain Terpilih */}
          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-peach-100 border border-line">
              {selectedPlayers.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary-700 text-white text-caption font-semibold shadow-xs"
                >
                  <span>{p.nama}</span>
                  <button
                    type="button"
                    onClick={() => handleTogglePlayer(p.id)}
                    className="hover:bg-white/20 rounded-full p-0.5 transition-colors focus:outline-none"
                    aria-label={`Hapus ${p.nama}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-line text-center text-caption text-ink-400 bg-peach-50/50">
              Belum ada pemain dipilih untuk sesi ini
            </div>
          )}

          {/* Input Pencarian Pemain */}
          <div ref={searchContainerRef} className="relative">
            <SearchField
              value={searchQuery}
              onChange={(v) => {
                setSearchQuery(v);
                setDropdownOpen(true);
              }}
              placeholder="Cari atau tambah nama pemain..."
              aria-label="Cari pemain"
            />

            {/* Dropdown Hasil Pencarian */}
            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-56 overflow-y-auto rounded-xl border border-line bg-surface shadow-float py-1 divide-y divide-peach-50">
                {filteredDropdownPlayers.length > 0 ? (
                  filteredDropdownPlayers.map((p) => {
                    const isSelected = selectedIds.has(p.id);
                    const count = p.sesi_count ?? 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectFromDropdown(p)}
                        className="w-full px-3 py-2.5 text-left flex items-center justify-between hover:bg-peach-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-body font-medium text-ink-900">
                            {p.nama}
                          </span>
                          {count === 0 ? (
                            <span className="text-caption font-medium px-1.5 py-0.5 rounded bg-warning-tonal text-warning">
                              Belum main
                            </span>
                          ) : (
                            <span className="text-caption font-medium px-1.5 py-0.5 rounded bg-peach-100 text-ink-600">
                              {count}x main
                            </span>
                          )}
                        </div>
                        {isSelected ? (
                          <span className="text-caption font-semibold text-primary-700">
                            Dipilih
                          </span>
                        ) : (
                          <span className="text-caption text-ink-400">+ Pilih</span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-3 text-caption text-ink-400 text-center">
                    Tidak ada pemain &quot;{searchQuery}&quot; ditemukan
                  </div>
                )}

                {/* Tombol Tambah Cepat Pemain Baru */}
                {queryTrimmed && !exactMatchExists && (
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(searchQuery)}
                    className="w-full px-3 py-2.5 text-left text-body font-medium text-primary-700 hover:bg-primary-100 transition-colors flex items-center gap-2 bg-peach-50"
                  >
                    <span className="text-base font-bold">+</span>
                    <span>
                      Tambah <strong>&quot;{searchQuery.trim()}&quot;</strong> sebagai pemain baru
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Rekomendasi Cepat (Hanya pemain yang belum dipilih) */}
          {unselectedRekomendasi.length > 0 && selectedIds.size < 4 && (
            <div className="flex flex-col gap-1.5 pt-0.5">
              <span className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
                Rekomendasi Pemain (Paling Sedikit Main):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {unselectedRekomendasi.slice(0, 6).map((p) => {
                  const count = p.sesi_count ?? 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleTogglePlayer(p.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-caption font-medium bg-peach-100 hover:bg-peach-200 border border-line text-ink-700 active:scale-95 transition-all"
                    >
                      <span>+ {p.nama}</span>
                      <span className="text-ink-400 text-[10px]">({count}x)</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. Opsi Draft Sesi (Ramping & Tanpa Box Biru Redundan) */}
        <div className="rounded-xl border border-line bg-surface p-3.5 flex items-center justify-between shadow-xs">
          <div
            className="cursor-pointer select-none pr-3"
            onClick={() => setIsDraft((v) => !v)}
          >
            <p className="text-body font-semibold text-ink-900">
              Draft Sesi (Sedang Main)
            </p>
            <p className="text-caption text-ink-500 mt-0.5">
              Input jumlah bola nanti setelah sesi selesai
            </p>
          </div>
          <Switch
            checked={isDraft}
            onChange={setIsDraft}
            aria-label="Draft Sesi (Sedang Main)"
          />
        </div>

        {/* 3. Bola Terpakai (Hanya jika bukan draft) */}
        {!isDraft && (
          <div className="rounded-xl border border-line bg-surface p-3.5 flex items-center justify-between shadow-xs">
            <div>
              <p className="text-body font-semibold text-ink-900">Bola Terpakai</p>
              <p className="text-caption text-ink-500 mt-0.5">Jumlah shuttlecock sesi ini</p>
            </div>
            <Stepper
              value={bolaTermakai}
              onChange={setBolaTermakai}
              min={1}
            />
          </div>
        )}

        {/* 4. Lapangan Segmented Control */}
        <div className="flex flex-col gap-1.5">
          <label className="text-caption font-semibold text-ink-700">
            Lapangan
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => {
                  setLapangan(num);
                  setIsCustomLapangan(false);
                }}
                className={[
                  'h-10 rounded-xl border text-body font-semibold transition-all',
                  !isCustomLapangan && lapangan === num
                    ? 'border-primary-700 bg-primary-100 text-primary-700 shadow-xs'
                    : 'border-line bg-surface text-ink-600 hover:bg-peach-50',
                ].join(' ')}
              >
                Lap {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomLapangan(true)}
              className={[
                'h-10 rounded-xl border text-body font-semibold transition-all',
                isCustomLapangan
                  ? 'border-primary-700 bg-primary-100 text-primary-700 shadow-xs'
                  : 'border-line bg-surface text-ink-600 hover:bg-peach-50',
              ].join(' ')}
            >
              Custom...
            </button>
          </div>

          {isCustomLapangan && (
            <div className="mt-1 flex items-center gap-2 bg-peach-50 p-2.5 rounded-xl border border-line">
              <span className="text-caption font-medium text-ink-700 shrink-0">
                Nomor Lapangan:
              </span>
              <input
                type="number"
                min={1}
                max={999}
                value={customLapanganInput}
                onChange={(e) => setCustomLapanganInput(e.target.value)}
                placeholder="3"
                className="w-20 text-center h-8 rounded-lg border border-line bg-surface px-2 text-body font-semibold text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>
          )}
        </div>

        {/* 5. Ditanggung Seseorang */}
        <div className="flex flex-col gap-2">
          <div
            onClick={() => {
              setDitanggung((v) => {
                const next = !v;
                if (!next) setPenanggungId(null);
                return next;
              });
            }}
            className="flex items-center justify-between w-full h-11 px-3.5 rounded-xl border border-line bg-surface hover:bg-peach-50 transition-colors cursor-pointer select-none shadow-xs"
          >
            <span className="text-body font-medium text-ink-800">Ditanggung seseorang</span>
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
            <div className="bg-peach-50 border border-line rounded-xl p-3 flex flex-col gap-2">
              <p className="text-caption font-semibold text-ink-700">Pilih Pemain Penanggung:</p>
              {selectedPlayers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedPlayers.map((p) => (
                    <Chip
                      key={p.id}
                      size="sm"
                      label={p.nama}
                      selected={penanggungId === p.id}
                      onSelect={() => setPenanggungId(penanggungId === p.id ? null : p.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-caption text-ink-500 italic">
                  Pilih minimal 1 pemain di atas terlebih dahulu.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
}
