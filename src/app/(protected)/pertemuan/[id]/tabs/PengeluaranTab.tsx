'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { formatRupiah } from '@/lib/money';

interface Transaksi {
  id: string;
  nominal: number;
  tipe: 'pemasukan' | 'pengeluaran';
  keterangan: string;
  dapat_diubah: boolean;
  dibuat_pada: string;
  kategori_nama?: string | null;
}

interface KategoriKas {
  id: string;
  nama: string;
  tipe: 'pemasukan' | 'pengeluaran';
}

interface Konfigurasi {
  biaya_sewa_default: number;
}

interface PengeluaranTabProps {
  pertemuanId: string;
  terkunci: boolean;
}

export function PengeluaranTab({ pertemuanId, terkunci }: PengeluaranTabProps) {
  const [list, setList] = useState<Transaksi[]>([]);
  const [kategoriList, setKategoriList] = useState<KategoriKas[]>([]);
  const [pemainMap, setPemainMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Konfigurasi | null>(null);

  // General Pengeluaran Sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeShortcut, setActiveShortcut] = useState<'sewa' | 'tambah_jam' | 'minum' | 'kok' | 'lainnya' | null>(null);
  const [kategoriId, setKategoriId] = useState('');
  const [nominal, setNominal] = useState('');
  const [keterangan, setKeterangan] = useState('');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  // Delete transaction state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kasRes, configRes, kategoriRes, pesertaRes] = await Promise.all([
        fetch(`/api/v1/kas?pertemuan_id=${pertemuanId}&per_page=50`),
        fetch('/api/v1/konfigurasi'),
        fetch('/api/v1/kategori-kas?per_page=100'),
        fetch(`/api/v1/pertemuan/${pertemuanId}/peserta`),
      ]);
      const [kasJson, configJson, kategoriJson, pesertaJson] = await Promise.all([
        kasRes.json(),
        configRes.json(),
        kategoriRes.json(),
        pesertaRes.json(),
      ]);

      if (kasRes.ok) {
        setList(kasJson.data ?? []);
      }
      if (configRes.ok) {
        setConfig(configJson.data as Konfigurasi);
      }
      if (kategoriRes.ok) {
        setKategoriList(kategoriJson.data ?? []);
      }
      if (pesertaRes.ok) {
        const pMap = new Map<string, string>();
        for (const p of pesertaJson.data ?? []) {
          pMap.set(p.pemain_id, p.nama);
        }
        setPemainMap(pMap);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [pertemuanId]);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  const pengeluaranKategori = kategoriList.filter((k) => k.tipe === 'pengeluaran');

  const openPengeluaranSheet = () => {
    const defaultSewa = pengeluaranKategori.find((k) =>
      k.nama.toLowerCase().includes('sewa')
    );
    setKategoriId(defaultSewa?.id ?? pengeluaranKategori[0]?.id ?? '');
    setNominal(config?.biaya_sewa_default ? String(config.biaya_sewa_default) : '');
    setKeterangan('Sewa Lapangan');
    setActiveShortcut('sewa');
    setSheetError(null);
    setSheetOpen(true);
  };

  // Shortcuts / Quick Templates
  const applyShortcut = (type: 'sewa' | 'tambah_jam' | 'minum' | 'kok' | 'lainnya') => {
    setActiveShortcut(type);
    const sewaKat = pengeluaranKategori.find((k) =>
      k.nama.toLowerCase().includes('sewa')
    );
    const bolaKat = pengeluaranKategori.find(
      (k) =>
        k.nama.toLowerCase().includes('bola') ||
        k.nama.toLowerCase().includes('kok')
    );
    const fallbackKatId = pengeluaranKategori[0]?.id ?? '';

    switch (type) {
      case 'sewa':
        setKategoriId(sewaKat?.id ?? fallbackKatId);
        setKeterangan('Sewa Lapangan');
        setNominal(config?.biaya_sewa_default ? String(config.biaya_sewa_default) : '');
        break;
      case 'tambah_jam':
        setKategoriId(sewaKat?.id ?? fallbackKatId);
        setKeterangan('Tambah Jam Lapangan (1 Jam)');
        setNominal(config?.biaya_sewa_default ? String(config.biaya_sewa_default) : '');
        break;
      case 'minum':
        setKategoriId(fallbackKatId);
        setKeterangan('Air Minum / Konsumsi');
        setNominal('');
        break;
      case 'kok':
        setKategoriId(bolaKat?.id ?? fallbackKatId);
        setKeterangan('Beli Shuttlecock Tambahan');
        setNominal('');
        break;
      case 'lainnya':
        setKeterangan('');
        setNominal('');
        break;
    }
  };

  const handleSimpanPengeluaran = async () => {
    const nom = parseInt(nominal, 10);
    if (isNaN(nom) || nom <= 0) {
      setSheetError('Nominal harus lebih dari 0');
      return;
    }
    const finalKategoriId =
      kategoriId ||
      pengeluaranKategori.find((k) => k.nama.toLowerCase().includes('sewa'))?.id ||
      pengeluaranKategori[0]?.id;

    if (!finalKategoriId) {
      setSheetError('Kategori pengeluaran tidak ditemukan');
      return;
    }
    if (!keterangan.trim()) {
      setSheetError('Keterangan wajib diisi');
      return;
    }

    setSheetLoading(true);
    setSheetError(null);
    try {
      const res = await fetch('/api/v1/kas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal: nom,
          tipe: 'pengeluaran',
          kategori_id: finalKategoriId,
          keterangan: keterangan.trim(),
          pertemuan_id: pertemuanId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSheetOpen(false);
        fetchData();
      } else {
        setSheetError(json.message ?? 'Gagal mencatat pengeluaran');
      }
    } catch {
      setSheetError('Terjadi kesalahan jaringan');
    } finally {
      setSheetLoading(false);
    }
  };

  const handleDeleteKas = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/v1/kas/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteId(null);
        fetchData();
      }
    } catch {
      // ignore
    } finally {
      setDeleteLoading(false);
    }
  };

  const formatKeterangan = (ket: string) => {
    const match = ket.match(/Tagihan pertemuan pemain ([0-9a-f-]{36})/i);
    if (match) {
      const pName = pemainMap.get(match[1]);
      if (pName) {
        return `Tagihan pertemuan — ${pName}`;
      }
    }
    return ket;
  };

  const totalMasuk = list
    .filter((t) => t.tipe === 'pemasukan')
    .reduce((acc, t) => acc + t.nominal, 0);

  const totalKeluar = list
    .filter((t) => t.tipe === 'pengeluaran')
    .reduce((acc, t) => acc + t.nominal, 0);

  if (loading && list.length === 0) {
    return (
      <div className="p-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Ringkasan Arus Kas Pertemuan */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5">
          <p className="text-[11px] font-medium text-emerald-800">Total Masuk</p>
          <p className="text-sm font-bold text-emerald-700 mt-0.5">
            {formatRupiah(totalMasuk)}
          </p>
        </div>
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5">
          <p className="text-[11px] font-medium text-rose-800">Total Keluar</p>
          <p className="text-sm font-bold text-rose-700 mt-0.5">
            {formatRupiah(totalKeluar)}
          </p>
        </div>
      </div>

      {list.length === 0 && (
        <EmptyState
          message="Belum ada transaksi"
          hint={!terkunci ? "Gunakan tombol di bawah untuk menambah pengeluaran" : undefined}
        />
      )}

      {/* Transaction List */}
      <div className="flex flex-col gap-3">
        {list.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-3.5 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-neutral-900 text-sm">
                    {formatRupiah(t.nominal)}
                  </p>
                  <Badge
                    label={t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                    variant={t.tipe === 'pemasukan' ? 'success' : 'danger'}
                  />
                </div>
                <p className="text-xs text-neutral-600 mt-1 font-medium">
                  {formatKeterangan(t.keterangan)}
                </p>
                {t.kategori_nama && (
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Kategori: {t.kategori_nama}
                  </p>
                )}
              </div>

              {/* Delete action for manual expenses */}
              {t.dapat_diubah && !terkunci && (
                <button
                  type="button"
                  onClick={() => setDeleteId(t.id)}
                  className="text-neutral-400 hover:text-danger-600 p-1 text-xs transition-colors shrink-0"
                  aria-label="Hapus pengeluaran"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* General Tambah Pengeluaran Button */}
      {!terkunci && (
        <div className="mt-4 pt-1">
          <Button
            variant="secondary"
            className="w-full h-11 font-medium"
            onClick={openPengeluaranSheet}
          >
            + Tambah Pengeluaran
          </Button>
        </div>
      )}

      {/* General Pengeluaran Sheet with Shortcuts */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Tambah Pengeluaran"
      >
        <div className="flex flex-col gap-4">
          {/* Shortcuts */}
          <div>
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
              Shortcut Cepat
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                size="sm"
                label="🏸 Sewa Lapangan"
                selected={activeShortcut === 'sewa'}
                onSelect={() => applyShortcut('sewa')}
              />
              <Chip
                size="sm"
                label="⏱️ Tambah Jam Lapangan"
                selected={activeShortcut === 'tambah_jam'}
                onSelect={() => applyShortcut('tambah_jam')}
              />
              <Chip
                size="sm"
                label="🥤 Air Minum"
                selected={activeShortcut === 'minum'}
                onSelect={() => applyShortcut('minum')}
              />
              <Chip
                size="sm"
                label="🧰 Kok / Bola"
                selected={activeShortcut === 'kok'}
                onSelect={() => applyShortcut('kok')}
              />
              <Chip
                size="sm"
                label="📝 Lainnya"
                selected={activeShortcut === 'lainnya'}
                onSelect={() => applyShortcut('lainnya')}
              />
            </div>
          </div>


          {/* Nominal Input */}
          <Input
            label="Nominal Pengeluaran"
            type="number"
            value={nominal}
            onChange={(e) => setNominal(e.target.value)}
            placeholder="Contoh: 100000"
            min={1}
          />

          {/* Keterangan Input */}
          <Input
            label="Keterangan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Contoh: Sewa Lapangan 1 & 2, Tambah 1 Jam..."
          />

          {sheetError && (
            <p className="text-sm text-danger-600 bg-danger-50 border border-danger-200 rounded-lg p-2.5" role="alert">
              {sheetError}
            </p>
          )}

          <div className="flex gap-3 pt-2 pb-4">
            <Button
              variant="secondary"
              onClick={() => setSheetOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSimpanPengeluaran}
              loading={sheetLoading}
              className="flex-1"
            >
              Simpan Pengeluaran
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Delete confirmation dialog */}
      <BottomSheet
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Hapus Pengeluaran"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-neutral-600">
            Apakah Anda yakin ingin menghapus catatan pengeluaran ini dari kas pertemuan?
          </p>
          <div className="flex gap-3 pt-2 pb-4">
            <Button
              variant="secondary"
              onClick={() => setDeleteId(null)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteKas}
              loading={deleteLoading}
              className="flex-1"
            >
              Hapus
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
