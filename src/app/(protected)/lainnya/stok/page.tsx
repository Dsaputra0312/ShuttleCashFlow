'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Stepper } from '@/components/ui/Stepper';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { formatRupiah } from '@/lib/money';
import { formatStokBola, hitungTotalBiji } from '@/lib/stock';

interface StokData {
  stok_saat_ini: number;
  stok_saat_ini_formatted?: string;
  stok_tabung?: number;
  stok_biji?: number;
  total_pembelian_tabung?: number;
  total_pembelian_bola: number;
  total_koreksi: number;
  total_terpakai: number;
  isi_per_tabung?: number;
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

  // Koreksi / Atur Stok sheet
  const [koreksiOpen, setKoreksiOpen] = useState(false);
  const [koreksiMode, setKoreksiMode] = useState<'set_stok' | 'tambah_kurang'>('set_stok');

  // Mode: Atur Sisa Fisik (Stok Awal / Stok Opname)
  const [setTabung, setSetTabung] = useState('0');
  const [setBiji, setSetBiji] = useState('0');

  // Mode: Tambah / Kurang Stok
  const [operasiTipe, setOperasiTipe] = useState<'+' | '-'>('-');
  const [adjTabung, setAdjTabung] = useState('0');
  const [adjBiji, setAdjBiji] = useState('0');

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
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchStok(page);
      }
    });
    return () => {
      ignore = true;
    };
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
        addToast(`Berhasil beli ${beliTabung} tabung (${beliTabung * 12} biji bola)`, 'success');
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

  const openKoreksiModal = () => {
    const currentBiji = stok?.stok_saat_ini ?? 0;
    const currentTabung = Math.floor(Math.max(0, currentBiji) / 12);
    const currentRemBiji = Math.max(0, currentBiji) % 12;

    setKoreksiMode('set_stok');
    setSetTabung(String(currentTabung));
    setSetBiji(String(currentRemBiji));
    setOperasiTipe('-');
    setAdjTabung('0');
    setAdjBiji('0');
    setKoreksiAlasan('');
    setKoreksiError(null);
    setKoreksiOpen(true);
  };

  const handleSetBijiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setSetBiji('');
      setKoreksiError(null);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 12) {
      setSetBiji('12');
      setKoreksiError('Inputan biji tidak bisa lebih dari 12 (1 tabung = 12 biji)');
      return;
    }
    setKoreksiError(null);
    setSetBiji(val);
  };

  const handleAdjBijiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setAdjBiji('');
      setKoreksiError(null);
      return;
    }
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 12) {
      setAdjBiji('12');
      setKoreksiError('Inputan biji tidak bisa lebih dari 12 (1 tabung = 12 biji)');
      return;
    }
    setKoreksiError(null);
    setAdjBiji(val);
  };

  const handleKoreksi = async () => {
    const currentTotal = stok?.stok_saat_ini ?? 0;
    let diffBiji = 0;
    let finalAlasan = koreksiAlasan.trim();

    if (koreksiMode === 'set_stok') {
      const t = parseInt(setTabung, 10);
      const b = parseInt(setBiji, 10);
      if (isNaN(t) || t < 0 || isNaN(b) || b < 0) {
        setKoreksiError('Jumlah tabung dan biji harus angka valid >= 0');
        return;
      }
      if (b > 12) {
        setKoreksiError('Inputan biji tidak bisa lebih dari 12 (1 tabung = 12 biji)');
        return;
      }
      const targetBiji = hitungTotalBiji(t, b);
      diffBiji = targetBiji - currentTotal;

      if (diffBiji === 0) {
        setKoreksiError('Target stok sama dengan stok saat ini (tidak ada perubahan)');
        return;
      }

      if (!finalAlasan) {
        finalAlasan = `Pencatatan sisa fisik (${t} Tabung ${b} Biji)`;
      }
    } else {
      const t = parseInt(adjTabung, 10) || 0;
      const b = parseInt(adjBiji, 10) || 0;
      if (b > 12) {
        setKoreksiError('Inputan biji tidak bisa lebih dari 12 (1 tabung = 12 biji)');
        return;
      }
      if (t === 0 && b === 0) {
        setKoreksiError('Masukkan jumlah tabung atau biji penyesuaian');
        return;
      }
      const rawTotal = hitungTotalBiji(t, b);
      diffBiji = operasiTipe === '+' ? rawTotal : -rawTotal;

      if (!finalAlasan) {
        setKoreksiError('Alasan penyesuaian stok wajib diisi');
        return;
      }
    }

    setKoreksiLoading(true);
    setKoreksiError(null);
    try {
      const res = await fetch('/api/v1/stok/koreksi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jumlah: diffBiji, alasan: finalAlasan }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Koreksi / penyesuaian stok berhasil disimpan', 'success');
        setKoreksiOpen(false);
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

  // Real-time preview for set_stok mode
  const previewTargetBiji = hitungTotalBiji(parseInt(setTabung, 10) || 0, parseInt(setBiji, 10) || 0);
  const previewDiff = previewTargetBiji - (stok?.stok_saat_ini ?? 0);

  // Real-time preview for tambah_kurang mode
  const previewAdjTotalBiji = hitungTotalBiji(parseInt(adjTabung, 10) || 0, parseInt(adjBiji, 10) || 0);
  const previewAdjNet = operasiTipe === '+' ? previewAdjTotalBiji : -previewAdjTotalBiji;
  const previewNewTotal = (stok?.stok_saat_ini ?? 0) + previewAdjNet;

  return (
    <div className="p-4 max-w-xl mx-auto">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push('/lainnya')}
        className="text-primary-600 text-sm font-medium mb-3 flex items-center gap-1 active:opacity-75"
      >
        ← Kembali
      </button>

      <h1 className="text-xl font-bold text-neutral-900 mb-4">Stok Bola</h1>

      {/* Stok Utama Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-5 mb-4">
        {loading ? (
          <p className="text-neutral-500 text-sm text-center py-4">Memuat data stok...</p>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                Sisa Bola Saat Ini
              </p>
              <p className="text-3xl sm:text-4xl font-extrabold text-primary-700 tracking-tight">
                {stok?.stok_saat_ini_formatted ?? formatStokBola(stok?.stok_saat_ini ?? 0)}
              </p>
              <p className="text-xs text-neutral-500 mt-1.5 font-medium">
                Total <span className="font-semibold text-neutral-800">{stok?.stok_saat_ini ?? 0}</span> biji bola tersisa
                <span className="text-neutral-400"> (1 Tabung = 12 Biji)</span>
              </p>
            </div>

            {stok && (
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-neutral-600 border-t border-neutral-100 pt-3.5">
                <div className="bg-neutral-50 rounded-xl py-2 px-1 border border-neutral-100">
                  <p className="font-bold text-neutral-800 text-sm">
                    {stok.total_pembelian_tabung ?? Math.floor(stok.total_pembelian_bola / 12)} Tabung
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Dibeli ({stok.total_pembelian_bola} bola)
                  </p>
                </div>
                <div className="bg-neutral-50 rounded-xl py-2 px-1 border border-neutral-100">
                  <p className="font-bold text-neutral-800 text-sm">{stok.total_terpakai} Biji</p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Terpakai di sesi</p>
                </div>
                <div className="bg-neutral-50 rounded-xl py-2 px-1 border border-neutral-100">
                  <p className="font-bold text-neutral-800 text-sm">
                    {stok.total_koreksi >= 0 ? '+' : ''}{stok.total_koreksi} Biji
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Penyesuaian</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mb-5">
        <Button
          variant="secondary"
          className="flex-1 font-semibold"
          onClick={() => {
            setBeliTabung(1);
            setBeliHarga('');
            setBeliError(null);
            setBeliOpen(true);
          }}
        >
          🛒 Beli Bola (Tabung)
        </Button>
        <Button
          variant="secondary"
          className="flex-1 font-semibold"
          onClick={openKoreksiModal}
        >
          ⚙️ Atur / Koreksi Stok
        </Button>
      </div>

      {/* Riwayat */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-neutral-900 text-base">Riwayat Pergerakan Stok</h2>
        <span className="text-xs text-neutral-500">
          {pagination?.total ?? 0} catatan
        </span>
      </div>

      {loading && <SkeletonList count={3} />}

      {!loading && (stok?.riwayat.data ?? []).length === 0 && (
        <EmptyState
          message="Belum ada riwayat"
          hint="Riwayat pembelian bola dan koreksi fisik akan tercatat di sini"
        />
      )}

      <div className="flex flex-col gap-2.5">
        {(stok?.riwayat.data ?? []).map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-neutral-200/90 shadow-sm p-3.5 transition-all"
          >
            {item.tipe === 'pembelian' ? (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      PEMBELIAN
                    </span>
                    <p className="font-semibold text-sm text-neutral-900">
                      Beli {item.jumlah_tabung} Tabung ({item.jumlah_tabung * item.isi_per_tabung} bola)
                    </p>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(item.dibuat_pada).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <p className="text-sm font-bold text-danger-700 whitespace-nowrap">
                  {formatRupiah(item.harga_total)}
                </p>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.jumlah >= 0
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      KOREKSI
                    </span>
                    <p className="font-semibold text-sm text-neutral-900">
                      {item.jumlah >= 0 ? '+' : ''}{item.jumlah} bola{' '}
                      <span className="text-xs font-normal text-neutral-500">
                        ({formatStokBola(Math.abs(item.jumlah))})
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 font-medium">{item.alasan}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {new Date(item.dibuat_pada).toLocaleDateString('id-ID', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-xs font-medium text-neutral-600">
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

      {/* Beli Bola Sheet */}
      <BottomSheet
        open={beliOpen}
        onClose={() => setBeliOpen(false)}
        title="Pembelian Bola"
      >
        <div className="flex flex-col gap-4">
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-600">
            <p className="font-semibold text-neutral-800 mb-0.5">Ketentuan Pembelian</p>
            <p>
              Pembelian bola dihitung per tabung. 1 Tabung = <strong>12 biji bola</strong>.
              Pengeluaran kas otomatis dicatat.
            </p>
          </div>

          <Stepper
            label="Jumlah Tabung"
            value={beliTabung}
            onChange={setBeliTabung}
            min={1}
          />
          <p className="text-xs text-primary-700 font-semibold -mt-2">
            = {beliTabung * 12} biji bola baru
          </p>

          <Input
            label="Total Harga Beli (Rp)"
            type="number"
            value={beliHarga}
            onChange={(e) => setBeliHarga(e.target.value)}
            min={1}
            placeholder="Contoh: 150000"
          />

          {beliError && (
            <p className="text-sm text-danger-600" role="alert">
              {beliError}
            </p>
          )}

          <div className="flex gap-3 mt-1">
            <Button variant="secondary" onClick={() => setBeliOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleBeli} loading={beliLoading} className="flex-1">
              Simpan Pembelian
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Atur / Koreksi Stok Sheet */}
      <BottomSheet
        open={koreksiOpen}
        onClose={() => setKoreksiOpen(false)}
        title="Atur / Koreksi Stok Bola"
      >
        <div className="flex flex-col gap-4">
          {/* Mode Switcher */}
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setKoreksiMode('set_stok')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                koreksiMode === 'set_stok'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Atur Sisa Fisik (Stok Awal)
            </button>
            <button
              type="button"
              onClick={() => setKoreksiMode('tambah_kurang')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                koreksiMode === 'tambah_kurang'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Tambah / Kurang
            </button>
          </div>

          {koreksiMode === 'set_stok' ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Masukkan sisa fisik bola riil saat ini (misal sisa <strong>10 tabung 3 biji</strong>).
                Sistem akan menghitung penyesuaian otomatis agar stok sama persis.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Jumlah Tabung"
                  type="number"
                  min={0}
                  value={setTabung}
                  onChange={(e) => setSetTabung(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Jumlah Biji"
                  type="number"
                  min={0}
                  max={12}
                  hint="Maks. 12 biji"
                  value={setBiji}
                  onChange={handleSetBijiChange}
                  placeholder="0"
                />
              </div>

              {/* Live Preview */}
              <div className="bg-primary-50 border border-primary-200/80 rounded-xl p-3 text-xs flex flex-col gap-1">
                <div className="flex justify-between text-primary-900 font-semibold">
                  <span>Target Sisa Stok:</span>
                  <span>{formatStokBola(previewTargetBiji)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Stok saat ini:</span>
                  <span>{formatStokBola(stok?.stok_saat_ini ?? 0)}</span>
                </div>
                <div className="flex justify-between text-primary-800 border-t border-primary-200/60 pt-1 mt-0.5">
                  <span>Penyesuaian yang dicatat:</span>
                  <span className="font-bold">
                    {previewDiff >= 0 ? `+${previewDiff}` : previewDiff} bola
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-700">
                  Keterangan / Alasan (Opsional)
                </label>
                <input
                  type="text"
                  value={koreksiAlasan}
                  onChange={(e) => setKoreksiAlasan(e.target.value)}
                  placeholder={`Contoh: Pencatatan sisa fisik (${setTabung} Tabung ${setBiji} Biji)`}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Pilih operasi untuk menambah (misal bonus/hibah) atau mengurangi stok bola (misal rusak/hilang).
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOperasiTipe('-')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    operasiTipe === '-'
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  - Kurang Stok (Rusak/Hilang)
                </button>
                <button
                  type="button"
                  onClick={() => setOperasiTipe('+')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    operasiTipe === '+'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-neutral-200 text-neutral-600'
                  }`}
                >
                  + Tambah Stok (Bonus/Lainnya)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Tabung"
                  type="number"
                  min={0}
                  value={adjTabung}
                  onChange={(e) => setAdjTabung(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Biji"
                  type="number"
                  min={0}
                  max={12}
                  hint="Maks. 12 biji"
                  value={adjBiji}
                  onChange={handleAdjBijiChange}
                  placeholder="0"
                />
              </div>

              {/* Live Preview */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs flex flex-col gap-1">
                <div className="flex justify-between text-neutral-700">
                  <span>Perubahan:</span>
                  <span className="font-bold">
                    {operasiTipe}{previewAdjTotalBiji} biji ({operasiTipe}{formatStokBola(previewAdjTotalBiji)})
                  </span>
                </div>
                <div className="flex justify-between text-neutral-900 border-t border-neutral-200 pt-1 mt-0.5 font-semibold">
                  <span>Estimasi sisa stok baru:</span>
                  <span className="text-primary-700 font-bold">{formatStokBola(previewNewTotal)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-700">
                  Alasan Penyesuaian (Wajib)
                </label>
                <textarea
                  value={koreksiAlasan}
                  onChange={(e) => setKoreksiAlasan(e.target.value)}
                  placeholder="Contoh: 2 biji bola penyok / rusak saat sesi main"
                  rows={2}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {koreksiError && (
            <p className="text-sm text-danger-600" role="alert">
              {koreksiError}
            </p>
          )}

          <div className="flex gap-3 mt-1">
            <Button variant="secondary" onClick={() => setKoreksiOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleKoreksi} loading={koreksiLoading} className="flex-1">
              Simpan Penyesuaian
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
