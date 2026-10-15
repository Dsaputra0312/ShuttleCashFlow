'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
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

interface Konfigurasi {
  biaya_sewa_default: number;
}

interface PengeluaranTabProps {
  pertemuanId: string;
  terkunci: boolean;
}

export function PengeluaranTab({ pertemuanId, terkunci }: PengeluaranTabProps) {
  const [list, setList] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Konfigurasi | null>(null);

  // Sewa lapangan sheet
  const [sewaOpen, setSewaOpen] = useState(false);
  const [sewaLapangan, setSewaLapangan] = useState<1 | 2>(1);
  const [sewaNominal, setSewaNominal] = useState('');
  const [sewaLoading, setSewaLoading] = useState(false);
  const [sewaError, setSewaError] = useState<string | null>(null);
  const [kategoriSewaId, setKategoriSewaId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [kasRes, configRes, kategoriRes] = await Promise.all([
        fetch(`/api/v1/kas?pertemuan_id=${pertemuanId}&per_page=50`),
        fetch('/api/v1/konfigurasi'),
        fetch('/api/v1/kategori-kas?per_page=100'),
      ]);
      const [kasJson, configJson, kategoriJson] = await Promise.all([
        kasRes.json(),
        configRes.json(),
        kategoriRes.json(),
      ]);

      if (kasRes.ok) {
        setList(kasJson.data ?? []);
      }
      if (configRes.ok) {
        setConfig(configJson.data as Konfigurasi);
        setSewaNominal(String(configJson.data?.biaya_sewa_default ?? ''));
      }
      if (kategoriRes.ok) {
        const sewaKat = (kategoriJson.data ?? []).find(
          (k: { nama: string; id: string }) => k.nama === 'Sewa Lapangan'
        );
        setKategoriSewaId(sewaKat?.id ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [pertemuanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openSewaSheet = () => {
    setSewaNominal(String(config?.biaya_sewa_default ?? ''));
    setSewaLapangan(1);
    setSewaError(null);
    setSewaOpen(true);
  };

  const handleSewa = async () => {
    const nominal = parseInt(sewaNominal, 10);
    if (isNaN(nominal) || nominal <= 0) {
      setSewaError('Nominal harus lebih dari 0');
      return;
    }
    if (!kategoriSewaId) {
      setSewaError('Kategori Sewa Lapangan tidak ditemukan');
      return;
    }
    setSewaLoading(true);
    setSewaError(null);
    try {
      const res = await fetch('/api/v1/kas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal,
          tipe: 'pengeluaran',
          kategori_id: kategoriSewaId,
          keterangan: `Sewa Lapangan ${sewaLapangan} — Pertemuan`,
          pertemuan_id: pertemuanId,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSewaOpen(false);
        fetchData();
      } else {
        setSewaError(json.message ?? 'Gagal');
      }
    } catch {
      setSewaError('Terjadi kesalahan jaringan');
    } finally {
      setSewaLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">Memuat...</div>
    );
  }

  return (
    <div className="p-4">
      {list.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-neutral-500 text-sm">Belum ada transaksi</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {list.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 text-sm">
                  {formatRupiah(t.nominal)}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">{t.keterangan}</p>
                {t.kategori_nama && (
                  <p className="text-xs text-neutral-400 mt-0.5">{t.kategori_nama}</p>
                )}
              </div>
              <Badge
                label={t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                variant={t.tipe === 'pemasukan' ? 'success' : 'danger'}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tambah Sewa Lapangan */}
      {!terkunci && (
        <div className="mt-4">
          <Button
            variant="secondary"
            className="w-full"
            onClick={openSewaSheet}
          >
            + Tambah Sewa Lapangan
          </Button>
        </div>
      )}

      {/* Sewa sheet */}
      <BottomSheet
        open={sewaOpen}
        onClose={() => setSewaOpen(false)}
        title="Tambah Sewa Lapangan"
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">Nomor Lapangan</p>
            <div className="flex gap-3">
              {([1, 2] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSewaLapangan(num)}
                  className={[
                    'flex h-11 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
                    sewaLapangan === num
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-neutral-300 bg-white text-neutral-700',
                  ].join(' ')}
                  aria-pressed={sewaLapangan === num}
                >
                  Lapangan {num}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Nominal"
            type="number"
            value={sewaNominal}
            onChange={(e) => setSewaNominal(e.target.value)}
            min={1}
          />

          {sewaError && (
            <p className="text-sm text-danger-600" role="alert">{sewaError}</p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setSewaOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleSewa} loading={sewaLoading} className="flex-1">
              Simpan
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
