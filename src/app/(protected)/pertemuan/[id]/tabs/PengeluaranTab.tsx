'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Chip } from '@/components/ui/Chip';
import { StatTile } from '@/components/ui/StatTile';
import { ListRow } from '@/components/ui/ListRow';
import { IconTile } from '@/components/ui/IconTile';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
      <div className="px-5 py-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      {/* Ringkasan Arus Kas Pertemuan */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <StatTile
          label="Total Masuk"
          value={formatRupiah(totalMasuk)}
        />
        <StatTile
          label="Total Keluar"
          value={formatRupiah(totalKeluar)}
        />
      </div>

      {list.length === 0 && (
        <EmptyState
          message="Belum ada transaksi"
          hint={!terkunci ? 'Gunakan tombol di bawah untuk menambah pengeluaran' : undefined}
        />
      )}

      {/* Transaction List */}
      <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-line">
        {list.map((t) => (
          <ListRow
            key={t.id}
            left={
              <IconTile
                tint={t.tipe === 'pemasukan' ? 'mint' : 'peach'}
                icon={Trash2}
                size={40}
              />
            }
            title={formatRupiah(t.nominal)}
            subtitle={`${formatKeterangan(t.keterangan)}${t.kategori_nama ? ` · ${t.kategori_nama}` : ''}`}
            right={
              <div className="flex items-center gap-2">
                <Badge
                  label={t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                  variant={t.tipe === 'pemasukan' ? 'success' : 'danger'}
                />
                {t.dapat_diubah && !terkunci && (
                  <button
                    type="button"
                    onClick={() => setDeleteId(t.id)}
                    className="text-ink-400 hover:text-danger p-1 transition-colors"
                    aria-label="Hapus pengeluaran"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            }
          />
        ))}
      </div>

      {/* General Tambah Pengeluaran Button */}
      {!terkunci && (
        <div className="mt-4 pt-1">
          <Button
            variant="secondary"
            className="w-full"
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
            <p className="text-caption font-semibold text-ink-600 uppercase tracking-wider mb-2">
              Shortcut Cepat
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Chip
                size="sm"
                label="Sewa Lapangan"
                selected={activeShortcut === 'sewa'}
                onSelect={() => applyShortcut('sewa')}
              />
              <Chip
                size="sm"
                label="Tambah Jam Lapangan"
                selected={activeShortcut === 'tambah_jam'}
                onSelect={() => applyShortcut('tambah_jam')}
              />
              <Chip
                size="sm"
                label="Air Minum"
                selected={activeShortcut === 'minum'}
                onSelect={() => applyShortcut('minum')}
              />
              <Chip
                size="sm"
                label="Kok / Bola"
                selected={activeShortcut === 'kok'}
                onSelect={() => applyShortcut('kok')}
              />
              <Chip
                size="sm"
                label="Lainnya"
                selected={activeShortcut === 'lainnya'}
                onSelect={() => applyShortcut('lainnya')}
              />
            </div>
          </div>

          {/* Nominal Input */}
          <CurrencyInput
            label="Nominal Pengeluaran"
            value={parseInt(nominal, 10) || 0}
            onChange={(val) => setNominal(String(val))}
            placeholder="0"
            quickAdds={[20000, 50000, 100000, 200000]}
          />

          {/* Keterangan Input */}
          <Input
            label="Keterangan"
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Contoh: Sewa Lapangan 1 &amp; 2, Tambah 1 Jam..."
          />

          {sheetError && (
            <p className="text-body text-danger bg-danger-tonal border border-danger/20 rounded-lg p-2.5" role="alert">
              {sheetError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
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
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteKas}
        title="Hapus Pengeluaran"
        description="Apakah Anda yakin ingin menghapus catatan pengeluaran ini dari kas pertemuan?"
        confirmLabel="Hapus"
        destructive
        loading={deleteLoading}
      />
    </div>
  );
}
