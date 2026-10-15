'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Stepper } from '@/components/ui/Stepper';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { formatRupiah } from '@/lib/money';

interface StokData {
  stok_saat_ini: number;
  stok_awal: number;
  total_pembelian_bola: number;
  total_koreksi: number;
  total_terpakai: number;
  riwayat: {
    data: RiwayatItem[];
    meta: { pagination: Pagination };
  };
}

interface PembelianItem {
  tipe: 'pembelian';
  id: string;
  dibuat_pada: string;
  jumlah_tabung: number;
  isi_per_tabung: number;
  harga_total: number;
}

interface KoreksiItem {
  tipe: 'koreksi';
  id: string;
  dibuat_pada: string;
  jumlah: number;
  alasan: string;
}

type RiwayatItem = PembelianItem | KoreksiItem;

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

function StokPageInner() {
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();

  const [stok, setStok] = useState<StokData | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Beli sheet
  const [beliOpen, setBeliOpen] = useState(false);
  const [beliTabung, setBeliTabung] = useState(1);
  const [beliHarga, setBeliHarga] = useState('');
  const [beliLoading, setBeliLoading] = useState(false);
  const [beliError, setBeliError] = useState<string | null>(null);

  // Koreksi sheet
  const [koreksiOpen, setKoreksiOpen] = useState(false);
  const [koreksiJumlah, setKoreksiJumlah] = useState('0');
  const [koreksiAlasan, setKoreksiAlasan] = useState('');
  const [koreksiLoading, setKoreksiLoading] = useState(false);
  const [koreksiError, setKoreksiError] = useState<string | null>(null);

  const fetchStok = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/stok?page=${p}&per_page=20`);
        const json = await res.json();
        if (res.ok) {
          setStok(json.data as StokData);
        } else {
          addToast(json.message ?? 'Gagal memuat stok', 'error');
        }
      } catch {
        addToast('Terjadi kesalahan jaringan', 'error');
      } finally {
        setLoading(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchStok(page);
  }, [page, fetchStok]);

  const handleBeli = async () => {
    const harga = parseInt(beliHarga, 10);
    if (isNaN(harga) || harga <= 0) {
      setBeliError('Harga total harus lebih dari 0');
      return;
    }
    setBeliLoading(true);
    setBeliError(null);
    try {
      const res = await fetch('/api/v1/stok/beli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jumlah_tabung: beliTabung, harga_total: harga }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast(`Berhasil beli ${beliTabung} tabung bola`, 'success');
        setBeliOpen(false);
        setBeliTabung(1);
        setBeliHarga('');
        fetchStok(1);
        setPage(1);
      } else {
        setBeliError(json.message ?? 'Gagal');
      }
    } catch {
      setBeliError('Terjadi kesalahan jaringan');
    } finally {
      setBeliLoading(false);
    }
  };

  const handleKoreksi = async () => {
    const jumlah = parseInt(koreksiJumlah, 10);
    if (isNaN(jumlah)) {
      setKoreksiError('Jumlah tidak valid');
      return;
    }
    if (!koreksiAlasan.trim()) {
      setKoreksiError('Alasan wajib diisi');
      return;
    }
    setKoreksiLoading(true);
    setKoreksiError(null);
    try {
      const res = await fetch('/api/v1/stok/koreksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jumlah, alasan: koreksiAlasan }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Koreksi stok berhasil dicatat', 'success');
        setKoreksiOpen(false);
        setKoreksiJumlah('0');
        setKoreksiAlasan('');
        fetchStok(1);
        setPage(1);
      } else {
        setKoreksiError(json.message ?? 'Gagal');
      }
    } catch {
      setKoreksiError('Terjadi kesalahan jaringan');
    } finally {
      setKoreksiLoading(false);
    }
  };

  const pagination = stok?.riwayat.meta.pagination;

  return (
    <div className="p-4">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push('/lainnya')}
        className="text-primary-600 text-sm mb-3"
      >
        ← Kembali
      </button>

      <h1 className="text-xl font-bold text-neutral-900 mb-4">Stok Bola</h1>

      {/* Stok card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 mb-4">
        {loading ? (
          <p className="text-neutral-500 text-sm text-center">Memuat...</p>
        ) : (
          <>
            <div className="text-center mb-3">
              <p className="text-4xl font-bold text-primary-700">
                {stok?.stok_saat_ini ?? 0}
              </p>
              <p className="text-sm text-neutral-500 mt-1">bola tersisa</p>
            </div>
            {stok && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-neutral-600 border-t border-neutral-100 pt-3">
                <div>
                  <p className="font-semibold">{stok.total_pembelian_bola}</p>
                  <p>Dibeli</p>
                </div>
                <div>
                  <p className="font-semibold">{stok.total_terpakai}</p>
                  <p>Terpakai</p>
                </div>
                <div>
                  <p className="font-semibold">{stok.total_koreksi >= 0 ? '+' : ''}{stok.total_koreksi}</p>
                  <p>Koreksi</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-4">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setBeliTabung(1);
            setBeliHarga('');
            setBeliError(null);
            setBeliOpen(true);
          }}
        >
          Beli Bola
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => {
            setKoreksiJumlah('0');
            setKoreksiAlasan('');
            setKoreksiError(null);
            setKoreksiOpen(true);
          }}
        >
          Koreksi Stok
        </Button>
      </div>

      {/* Riwayat */}
      <h2 className="font-semibold text-neutral-900 mb-3">Riwayat</h2>

      {!loading && (stok?.riwayat.data ?? []).length === 0 && (
        <p className="text-sm text-neutral-500 text-center py-4">Belum ada riwayat</p>
      )}

      <div className="flex flex-col gap-2">
        {(stok?.riwayat.data ?? []).map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-3"
          >
            {item.tipe === 'pembelian' ? (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-neutral-900">
                    Beli {item.jumlah_tabung} tabung ({item.jumlah_tabung * item.isi_per_tabung} bola)
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {new Date(item.dibuat_pada).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <p className="text-sm font-semibold text-danger-700">
                  {formatRupiah(item.harga_total)}
                </p>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-neutral-900">
                    Koreksi {item.jumlah >= 0 ? '+' : ''}{item.jumlah} bola
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">{item.alasan}</p>
                  <p className="text-xs text-neutral-400">
                    {new Date(item.dibuat_pada).toLocaleDateString('id-ID')}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-neutral-500">
            {page} / {pagination.total_pages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pagination.total_pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}

      {/* Beli sheet */}
      <BottomSheet
        open={beliOpen}
        onClose={() => setBeliOpen(false)}
        title="Beli Bola"
      >
        <div className="flex flex-col gap-4">
          <Stepper
            label="Jumlah Tabung"
            value={beliTabung}
            onChange={setBeliTabung}
            min={1}
          />
          <Input
            label="Harga Total"
            type="number"
            value={beliHarga}
            onChange={(e) => setBeliHarga(e.target.value)}
            min={1}
            placeholder="0"
          />
          {beliError && (
            <p className="text-sm text-danger-600" role="alert">{beliError}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setBeliOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleBeli} loading={beliLoading} className="flex-1">
              Simpan
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Koreksi sheet */}
      <BottomSheet
        open={koreksiOpen}
        onClose={() => setKoreksiOpen(false)}
        title="Koreksi Stok"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Jumlah (positif/negatif)"
            type="number"
            value={koreksiJumlah}
            onChange={(e) => setKoreksiJumlah(e.target.value)}
            placeholder="Contoh: -3 atau +5"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Alasan</label>
            <textarea
              value={koreksiAlasan}
              onChange={(e) => setKoreksiAlasan(e.target.value)}
              placeholder="Wajib diisi"
              rows={3}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {koreksiError && (
            <p className="text-sm text-danger-600" role="alert">{koreksiError}</p>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setKoreksiOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleKoreksi} loading={koreksiLoading} className="flex-1">
              Simpan
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default function StokPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-neutral-500">Memuat...</div>}>
      <StokPageInner />
    </Suspense>
  );
}
