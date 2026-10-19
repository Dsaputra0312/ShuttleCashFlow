'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Stepper } from '@/components/ui/Stepper';
import { Switch } from '@/components/ui/Switch';
import { SearchField } from '@/components/ui/SearchField';

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

  const queryTrimmed = searchQuery.trim().toLowerCase();
  const filteredDropdownPlayers = allPemain.filter((p) =>
    p.nama.toLowerCase().includes(queryTrimmed)
  );
  const exactMatchExists = allPemain.some(
    (p) => p.nama.trim().toLowerCase() === queryTrimmed
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Tambah Sesi">
      <div className="flex flex-col gap-4">
        {/* 1. Rekomendasi Pemain (Maksimal 8, urut paling sedikit main) */}
        {rekomendasi.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-caption font-semibold text-ink-600 uppercase tracking-wider">
                Rekomendasi Pemain
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {rekomendasi.map((p) => {
                const isSelected = selectedIds.has(p.id);
                const isLimitReached = selectedIds.size >= 4 && !isSelected;
                const count = p.sesi_count ?? 0;
                return (
                  <Chip
                    key={p.id}
                    size="sm"
                    label={
                      <span>
                        {p.nama}{' '}
                        <span className={isSelected ? 'text-white/70 text-[10px]' : 'text-ink-400 text-[10px]'}>
                          ({count}x)
                        </span>
                      </span>
                    }
                    selected={isSelected}
                    disabled={isLimitReached}
                    onSelect={() => handleTogglePlayer(p.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Search Pemain */}
        <div ref={searchContainerRef} className="relative">
          <label className="block text-caption font-medium text-ink-600 mb-1">
            Cari Pemain di Grup
          </label>
          <SearchField
            value={searchQuery}
            onChange={(v) => {
              setSearchQuery(v);
              setDropdownOpen(true);
            }}
            placeholder="Ketik nama untuk mencari atau menambah pemain..."
            aria-label="Cari pemain"
          />

          {/* Search Dropdown list */}
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

              {/* Quick Add new player button */}
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

        {/* 3. Pemain Dipilih (Maksimal 4) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-body font-medium text-ink-700">
              Pemain Dipilih ({selectedIds.size}/4)
            </p>
            {selectedIds.size === 4 && (
              <span className="text-caption font-medium text-primary-700 bg-primary-100 px-2 py-0.5 rounded">
                Maksimal 4 pemain tercapai
              </span>
            )}
          </div>
          {selectedIds.size > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedPlayers.map((p) => (
                <Chip
                  key={p.id}
                  size="sm"
                  label={p.nama}
                  selected
                  onSelect={() => handleTogglePlayer(p.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-caption text-ink-400 italic">
              Belum ada pemain dipilih (maksimal 4 orang)
            </p>
          )}
        </div>

        {/* 4. Opsi Draft Sesi */}
        <div className="rounded-xl border border-line bg-peach-100 p-3">
          <div className="flex items-center justify-between">
            <div
              className="cursor-pointer select-none pr-3"
              onClick={() => setIsDraft((v) => !v)}
            >
              <p className="text-body font-medium text-ink-900">
                Draft Sesi (Sedang Main)
              </p>
              <p className="text-caption text-ink-600 mt-0.5">
                Catat pemain sekarang, jumlah bola diinput saat sesi selesai
              </p>
            </div>
            <Switch
              checked={isDraft}
              onChange={setIsDraft}
              aria-label="Draft Sesi (Sedang Main)"
            />
          </div>
          {isDraft && (
            <div className="mt-2 text-caption text-primary-700 bg-primary-100 rounded-lg p-2 flex items-center gap-1.5">
              Jumlah bola disimpan 0 (draft). Anda dapat menginput bola ketika sesi selesai.
            </div>
          )}
        </div>

        {/* 5. Bola Terpakai (Hanya jika bukan draft) */}
        {!isDraft && (
          <Stepper
            label="Bola Terpakai"
            value={bolaTermakai}
            onChange={setBolaTermakai}
            min={1}
          />
        )}

        {/* 6. Lapangan (Bisa Custom) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-body font-medium text-ink-700">Lapangan</p>
            {isCustomLapangan && (
              <span className="text-caption text-primary-700 font-medium">
                Mode Custom
              </span>
            )}
          </div>
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
                  'flex h-11 items-center justify-center rounded-lg border text-body font-medium transition-colors',
                  !isCustomLapangan && lapangan === num
                    ? 'border-primary-700 bg-primary-100 text-primary-700 font-semibold'
                    : 'border-line bg-surface text-ink-700 hover:bg-peach-100',
                ].join(' ')}
                aria-pressed={!isCustomLapangan && lapangan === num}
              >
                Lapangan {num}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIsCustomLapangan(true);
              }}
              className={[
                'flex h-11 items-center justify-center rounded-lg border text-body font-medium transition-colors',
                isCustomLapangan
                  ? 'border-primary-700 bg-primary-100 text-primary-700 font-semibold'
                  : 'border-line bg-surface text-ink-700 hover:bg-peach-100',
              ].join(' ')}
              aria-pressed={isCustomLapangan}
            >
              Custom...
            </button>
          </div>

          {isCustomLapangan && (
            <div className="mt-2.5 flex items-center gap-2 bg-peach-100 p-2.5 rounded-lg border border-line">
              <span className="text-caption font-medium text-ink-700 shrink-0">
                Nomor Lapangan:
              </span>
              <input
                type="number"
                min={1}
                max={999}
                value={customLapanganInput}
                onChange={(e) => setCustomLapanganInput(e.target.value)}
                placeholder="Misal: 3, 4..."
                className="w-24 text-center h-9 rounded-lg border border-line bg-surface px-2 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
              <span className="text-caption text-ink-400">
                (Lapangan {customLapanganInput || '?'})
              </span>
            </div>
          )}
        </div>

        {/* 7. Ditanggung seseorang toggle */}
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
              <p className="text-caption text-ink-400 italic bg-peach-100 p-2.5 rounded-lg border border-line">
                Pilih minimal 1 pemain di atas untuk menentukan siapa yang menanggung bola sesi ini.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="text-body text-danger bg-danger-tonal border border-danger/20 rounded-lg p-2.5" role="alert">
            {error}
          </p>
        )}

        {/* 8. Action Button */}
        <div className="pt-3 pb-6 mb-2">
          <Button
            type="button"
            onClick={handleSimpan}
            loading={loading}
            className="w-full"
          >
            {isDraft ? 'Simpan Draft (Mulai Main)' : 'Simpan Sesi'}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
