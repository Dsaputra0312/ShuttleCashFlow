'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { formatRupiah } from '@/lib/money';

interface Transaksi {
  id: string;
  nominal: number;
  tipe: 'pemasukan' | 'pengeluaran';
  keterangan: string;
  referensi_tipe?: string | null;
  dapat_diubah: boolean;
  dibuat_pada: string;
  kategori_id: string | null;
  kategori_nama?: string | null;
}

interface Kategori {
  id: string;
  nama: string;
  tipe: 'pemasukan' | 'pengeluaran';
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface SaldoInfo {
  saldo_saat_ini: number;
  total_pemasukan: number;
  total_pengeluaran: number;
}

function KasPageInner() {
  const searchParams = useSearchParams();
  const { toasts, addToast, dismiss } = useToast();

  const [list, setList] = useState<Transaksi[]>([]);
  const [kategoriList, setKategoriList] = useState<Kategori[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Saldo
  const [saldoInfo, setSaldoInfo] = useState<SaldoInfo | null>(null);
  const [saldoLoading, setSaldoLoading] = useState(false);

  // Filters
  const [filterTipe, setFilterTipe] = useState<'pemasukan' | 'pengeluaran' | ''>('');
  const [filterKategori, setFilterKategori] = useState('');
  const [filterBulan, setFilterBulan] = useState(''); // YYYY-MM

  // Add sheet (Normal Pemasukan / Pengeluaran)
  const [addOpen, setAddOpen] = useState(false);
  const [addTipe, setAddTipe] = useState<'pemasukan' | 'pengeluaran'>('pemasukan');
  const [addNominal, setAddNominal] = useState('');
  const [addKategori, setAddKategori] = useState('');
  const [addKeterangan, setAddKeterangan] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Penyesuaian Kas sheet
  const [penyesuaianOpen, setPenyesuaianOpen] = useState(false);
  const [penyesuaianMode, setPenyesuaianMode] = useState<'set_saldo' | 'tambah_kurang'>('set_saldo');

  // Mode 1: Atur Saldo Fisik (Stok/Saldo Opname)
  const [targetSaldoInput, setTargetSaldoInput] = useState('');

  // Mode 2: Tambah / Kurang Kas
  const [operasiTipe, setOperasiTipe] = useState<'+' | '-'>('-');
  const [adjNominalInput, setAdjNominalInput] = useState('');

  const [penyesuaianAlasan, setPenyesuaianAlasan] = useState('');
  const [penyesuaianLoading, setPenyesuaianLoading] = useState(false);
  const [penyesuaianError, setPenyesuaianError] = useState<string | null>(null);

  const fetchSaldo = useCallback(async () => {
    setSaldoLoading(true);
    try {
      const res = await fetch('/api/v1/kas/penyesuaian');
      const json = await res.json();
      if (res.ok && json.data) {
        setSaldoInfo(json.data as SaldoInfo);
      }
    } catch {
      // silently ignore
    } finally {
      setSaldoLoading(false);
    }
  }, []);

  const fetchKategori = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/kategori-kas?per_page=100');
      const json = await res.json();
      if (res.ok) setKategoriList(json.data ?? []);
    } catch {
      // ignore
    }
  }, []);

  const fetchList = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          per_page: '20',
          ...(filterTipe ? { tipe: filterTipe } : {}),
          ...(filterKategori ? { kategori_id: filterKategori } : {}),
          ...(filterBulan ? { bulan: filterBulan } : {}),
        });
        const res = await fetch(`/api/v1/kas?${params}`);
        const json = await res.json();
        if (res.ok) {
          setList(json.data ?? []);
          setPagination(json.meta.pagination);
        } else {
          addToast(json.message ?? 'Gagal memuat data', 'error');
        }
      } catch {
        addToast('Terjadi kesalahan jaringan', 'error');
      } finally {
        setLoading(false);
      }
    },
    [filterTipe, filterKategori, filterBulan, addToast]
  );

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchSaldo();
        fetchKategori();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchSaldo, fetchKategori]);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchList(page);
      }
    });
    return () => {
      ignore = true;
    };
  }, [page, filterTipe, filterKategori, filterBulan, fetchList]);

  const openPenyesuaianModal = useCallback(() => {
    const current = saldoInfo?.saldo_saat_ini ?? 0;
    setPenyesuaianMode('set_saldo');
    setTargetSaldoInput(current > 0 ? String(current) : '0');
    setOperasiTipe('-');
    setAdjNominalInput('');
    setPenyesuaianAlasan('');
    setPenyesuaianError(null);
    setPenyesuaianOpen(true);
  }, [saldoInfo?.saldo_saat_ini]);

  // Open penyesuaian automatically if query param present
  useEffect(() => {
    if (searchParams.get('penyesuaian') === 'true') {
      let ignore = false;
      void Promise.resolve().then(() => {
        if (!ignore) {
          openPenyesuaianModal();
        }
      });
      return () => {
        ignore = true;
      };
    }
  }, [searchParams, openPenyesuaianModal]);

  const openAdd = (tipe: 'pemasukan' | 'pengeluaran') => {
    setAddTipe(tipe);
    setAddNominal('');
    setAddKategori('');
    setAddKeterangan('');
    setAddError(null);
    setAddOpen(true);
  };

  const handleAdd = async () => {
    const nominal = parseInt(addNominal, 10);
    if (isNaN(nominal) || nominal <= 0) {
      setAddError('Nominal harus lebih dari 0');
      return;
    }
    if (!addKategori) {
      setAddError('Pilih kategori');
      return;
    }
    setAddLoading(true);
    setAddError(null);
    try {
      const res = await fetch('/api/v1/kas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominal,
          tipe: addTipe,
          kategori_id: addKategori,
          keterangan: addKeterangan,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Transaksi berhasil dicatat', 'success');
        setAddOpen(false);
        fetchList(page);
        fetchSaldo();
      } else {
        setAddError(json.message ?? 'Gagal');
      }
    } catch {
      setAddError('Terjadi kesalahan jaringan');
    } finally {
      setAddLoading(false);
    }
  };

  const handlePenyesuaian = async () => {
    const current = saldoInfo?.saldo_saat_ini ?? 0;
    let payload: Record<string, unknown>;

    if (penyesuaianMode === 'set_saldo') {
      const target = parseInt(targetSaldoInput, 10);
      if (isNaN(target) || target < 0) {
        setPenyesuaianError('Target saldo kas harus angka valid >= 0');
        return;
      }
      if (target === current) {
        setPenyesuaianError('Target saldo sama dengan saldo kas saat ini (tidak ada perubahan)');
        return;
      }
      payload = {
        mode: 'set_saldo',
        target_saldo: target,
        alasan: penyesuaianAlasan.trim() || `Pencatatan sisa fisik kas (${formatRupiah(target)})`,
      };
    } else {
      const nom = parseInt(adjNominalInput, 10);
      if (isNaN(nom) || nom <= 0) {
        setPenyesuaianError('Nominal penyesuaian harus lebih dari 0');
        return;
      }
      if (!penyesuaianAlasan.trim()) {
        setPenyesuaianError('Alasan penyesuaian kas wajib diisi');
        return;
      }
      payload = {
        mode: 'tambah_kurang',
        operasi: operasiTipe,
        nominal: nom,
        alasan: penyesuaianAlasan.trim(),
      };
    }

    setPenyesuaianLoading(true);
    setPenyesuaianError(null);
    try {
      const res = await fetch('/api/v1/kas/penyesuaian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Penyesuaian kas berhasil disimpan', 'success');
        setPenyesuaianOpen(false);
        fetchList(1);
        setPage(1);
        fetchSaldo();
      } else {
        setPenyesuaianError(json.message ?? 'Gagal');
      }
    } catch {
      setPenyesuaianError('Terjadi kesalahan jaringan');
    } finally {
      setPenyesuaianLoading(false);
    }
  };

  const filteredKategori = kategoriList.filter((k) => k.tipe === addTipe);

  // Live preview for set_saldo mode
  const currentSaldoNum = saldoInfo?.saldo_saat_ini ?? 0;
  const targetSaldoNum = parseInt(targetSaldoInput, 10) || 0;
  const previewDiff = targetSaldoNum - currentSaldoNum;

  // Live preview for tambah_kurang mode
  const adjNominalNum = parseInt(adjNominalInput, 10) || 0;
  const previewAdjNet = operasiTipe === '+' ? adjNominalNum : -adjNominalNum;
  const previewNewSaldo = currentSaldoNum + previewAdjNet;

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Kas</h1>

      {/* Saldo Kas Utama Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-sm p-5 mb-4">
        {saldoLoading && !saldoInfo ? (
          <p className="text-neutral-500 text-sm text-center py-4">Memuat data saldo kas...</p>
        ) : (
          <>
            <div className="text-center mb-4">
              <p className="text-xs uppercase tracking-wider text-neutral-400 font-semibold mb-1">
                Saldo Kas Saat Ini
              </p>
              <p
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  (saldoInfo?.saldo_saat_ini ?? 0) >= 0 ? 'text-emerald-700' : 'text-danger-700'
                }`}
              >
                {formatRupiah(saldoInfo?.saldo_saat_ini ?? 0)}
              </p>
              <p className="text-xs text-neutral-500 mt-1.5 font-medium">
                Kas siap pakai untuk operasional grup badminton
              </p>
            </div>

            {saldoInfo && (
              <div className="grid grid-cols-2 gap-2 text-center text-xs text-neutral-600 border-t border-neutral-100 pt-3.5 mb-3.5">
                <div className="bg-emerald-50/60 rounded-xl py-2 px-1 border border-emerald-100/70">
                  <p className="font-bold text-emerald-800 text-sm">
                    {formatRupiah(saldoInfo.total_pemasukan)}
                  </p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Total Masuk</p>
                </div>
                <div className="bg-rose-50/60 rounded-xl py-2 px-1 border border-rose-100/70">
                  <p className="font-bold text-rose-800 text-sm">
                    {formatRupiah(saldoInfo.total_pengeluaran)}
                  </p>
                  <p className="text-[11px] text-rose-600 font-medium mt-0.5">Total Keluar</p>
                </div>
              </div>
            )}

            {/* Action: Penyesuaian Kas button */}
            <Button
              variant="secondary"
              className="w-full font-semibold flex items-center justify-center gap-2"
              onClick={openPenyesuaianModal}
            >
              <span>⚙️</span> Atur / Penyesuaian Kas
            </Button>
          </>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 mb-4">
        <div className="flex gap-2">
          {(['', 'pemasukan', 'pengeluaran'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setFilterTipe(t);
                setPage(1);
              }}
              className={[
                'flex-1 h-9 rounded-lg border text-sm font-medium transition-colors',
                filterTipe === t
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-neutral-300 bg-white text-neutral-600',
              ].join(' ')}
            >
              {t === '' ? 'Semua' : t === 'pemasukan' ? 'Masuk' : 'Keluar'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="month"
            value={filterBulan}
            onChange={(e) => {
              setFilterBulan(e.target.value);
              setPage(1);
            }}
            aria-label="Filter bulan"
            className="flex-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={filterKategori}
            onChange={(e) => {
              setFilterKategori(e.target.value);
              setPage(1);
            }}
            aria-label="Filter kategori"
            className="flex-1 h-9 rounded-lg border border-neutral-300 px-2 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Semua Kategori</option>
            {kategoriList.map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonList count={4} />
      ) : list.length === 0 ? (
        <EmptyState
          message="Belum ada transaksi"
          hint="Transaksi kas akan muncul di sini"
        />
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-3 bg-white rounded-xl border border-neutral-200/90 shadow-sm p-3.5 transition-all"
            >
              <div className="flex flex-col gap-1 items-start shrink-0">
                <Badge
                  label={t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                  variant={t.tipe === 'pemasukan' ? 'success' : 'danger'}
                />
                {t.referensi_tipe === 'penyesuaian_kas' && (
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">
                    PENYESUAIAN
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-neutral-900">
                  {formatRupiah(t.nominal)}
                </p>
                {t.keterangan && (
                  <p className="text-xs text-neutral-600 mt-0.5 font-medium line-clamp-2">
                    {t.keterangan}
                  </p>
                )}
                {t.kategori_nama && (
                  <p className="text-[11px] text-neutral-400 mt-0.5">{t.kategori_nama}</p>
                )}
              </div>
              <p className="text-xs text-neutral-400 shrink-0">
                {new Date(t.dibuat_pada).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                })}
              </p>
            </div>
          ))}
        </div>
      )}

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

      {/* FAB — two buttons (symmetrical and centered) */}
      <div className="fixed bottom-20 right-4 z-30 flex flex-col items-center gap-2.5">
        <button
          type="button"
          onClick={() => openAdd('pengeluaran')}
          aria-label="Tambah pengeluaran"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-danger-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 active:bg-danger-700"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => openAdd('pemasukan')}
          aria-label="Tambah pemasukan"
          className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 active:bg-primary-700"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Add sheet (Pemasukan / Pengeluaran Biasa) */}
      <BottomSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={addTipe === 'pemasukan' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'}
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nominal (Rp)"
            type="number"
            value={addNominal}
            onChange={(e) => setAddNominal(e.target.value)}
            min={1}
            placeholder="0"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Kategori</label>
            <select
              value={addKategori}
              onChange={(e) => setAddKategori(e.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Pilih Kategori</option>
              {filteredKategori.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Keterangan (opsional)"
            value={addKeterangan}
            onChange={(e) => setAddKeterangan(e.target.value)}
            placeholder="Deskripsi transaksi"
          />

          {addError && (
            <p className="text-sm text-danger-600" role="alert">
              {addError}
            </p>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAddOpen(false)} className="flex-1">
              Batal
            </Button>
            <Button onClick={handleAdd} loading={addLoading} className="flex-1">
              Simpan
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Atur / Penyesuaian Kas Sheet */}
      <BottomSheet
        open={penyesuaianOpen}
        onClose={() => setPenyesuaianOpen(false)}
        title="Atur / Penyesuaian Uang Kas"
      >
        <div className="flex flex-col gap-4">
          {/* Mode Switcher */}
          <div className="flex bg-neutral-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setPenyesuaianMode('set_saldo')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                penyesuaianMode === 'set_saldo'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Atur Saldo Fisik (Opname)
            </button>
            <button
              type="button"
              onClick={() => setPenyesuaianMode('tambah_kurang')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                penyesuaianMode === 'tambah_kurang'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Tambah / Kurang Saldo
            </button>
          </div>

          {penyesuaianMode === 'set_saldo' ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Masukkan jumlah saldo fisik riil kas saat ini (misal sisa <strong>Rp 500.000</strong>).
                Sistem akan menghitung penyesuaian otomatis agar saldo kas sama persis.
              </p>

              <Input
                label="Target Saldo Kas Riil (Rp)"
                type="number"
                min={0}
                value={targetSaldoInput}
                onChange={(e) => setTargetSaldoInput(e.target.value)}
                placeholder="0"
              />

              {/* Live Preview */}
              <div className="bg-primary-50 border border-primary-200/80 rounded-xl p-3 text-xs flex flex-col gap-1">
                <div className="flex justify-between text-primary-900 font-semibold">
                  <span>Target Saldo Kas:</span>
                  <span>{formatRupiah(targetSaldoNum)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Saldo Kas saat ini:</span>
                  <span>{formatRupiah(currentSaldoNum)}</span>
                </div>
                <div className="flex justify-between text-primary-800 border-t border-primary-200/60 pt-1 mt-0.5">
                  <span>Penyesuaian yang dicatat:</span>
                  <span className="font-bold">
                    {previewDiff === 0
                      ? 'Tidak ada perubahan'
                      : previewDiff > 0
                      ? `+${formatRupiah(previewDiff)} (Pemasukan)`
                      : `-${formatRupiah(Math.abs(previewDiff))} (Pengeluaran)`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-700">
                  Keterangan / Alasan (Opsional)
                </label>
                <input
                  type="text"
                  value={penyesuaianAlasan}
                  onChange={(e) => setPenyesuaianAlasan(e.target.value)}
                  placeholder={`Contoh: Pencatatan sisa fisik kas (${formatRupiah(targetSaldoNum)})`}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Pilih operasi untuk menambah (misal saldo awal/hibah) atau mengurangi saldo kas (misal selisih hitung/biaya tak tercatat).
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
                  - Kurang Kas (Selisih/Pengeluaran)
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
                  + Tambah Kas (Saldo Awal/Pemasukan)
                </button>
              </div>

              <Input
                label="Nominal Penyesuaian (Rp)"
                type="number"
                min={1}
                value={adjNominalInput}
                onChange={(e) => setAdjNominalInput(e.target.value)}
                placeholder="Contoh: 50000"
              />

              {/* Live Preview */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs flex flex-col gap-1">
                <div className="flex justify-between text-neutral-700">
                  <span>Perubahan Kas:</span>
                  <span className="font-bold">
                    {operasiTipe}{formatRupiah(adjNominalNum)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-900 border-t border-neutral-200 pt-1 mt-0.5 font-semibold">
                  <span>Estimasi Saldo Kas Baru:</span>
                  <span className="text-primary-700 font-bold">{formatRupiah(previewNewSaldo)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-neutral-700">
                  Alasan Penyesuaian (Wajib)
                </label>
                <textarea
                  value={penyesuaianAlasan}
                  onChange={(e) => setPenyesuaianAlasan(e.target.value)}
                  placeholder="Contoh: Selisih uang receh / Uang kas awal bulan"
                  rows={2}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {penyesuaianError && (
            <p className="text-sm text-danger-600" role="alert">
              {penyesuaianError}
            </p>
          )}

          <div className="flex gap-3 mt-1">
            <Button
              variant="secondary"
              onClick={() => setPenyesuaianOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handlePenyesuaian}
              loading={penyesuaianLoading}
              className="flex-1"
            >
              Simpan Penyesuaian
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

export default function KasPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-neutral-500">Memuat data kas...</div>}>
      <KasPageInner />
    </Suspense>
  );
}
