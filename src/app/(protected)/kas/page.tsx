'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { PageHeader } from '@/components/ui/PageHeader';
import { HeroCard } from '@/components/ui/HeroCard';
import { Tabs } from '@/components/ui/Tabs';
import { ListRow } from '@/components/ui/ListRow';
import { IconTile } from '@/components/ui/IconTile';
import { IconButton } from '@/components/ui/IconButton';
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

  const filterTabs = [
    { key: '', label: 'Semua' },
    { key: 'pemasukan', label: 'Masuk' },
    { key: 'pengeluaran', label: 'Keluar' },
  ];

  return (
    <div>
      <PageHeader title="Kas" />

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Hero Card — Saldo Kas */}
        {saldoLoading && !saldoInfo ? (
          <div className="rounded-2xl bg-primary-700 h-24 animate-pulse" />
        ) : (
          <div>
            <HeroCard
              title="Saldo Kas Saat Ini"
              value={formatRupiah(saldoInfo?.saldo_saat_ini ?? 0)}
              subtitle="Kas siap pakai untuk operasional grup"
            />
            {saldoInfo && (
              <div className="mt-3 flex gap-2">
                <div className="flex-1 bg-tint-mint rounded-xl p-3 border border-line text-center">
                  <p className="text-caption font-semibold text-icon-mint nums">
                    {formatRupiah(saldoInfo.total_pemasukan)}
                  </p>
                  <p className="text-caption text-ink-600 mt-0.5">Total Masuk</p>
                </div>
                <div className="flex-1 bg-tint-peach rounded-xl p-3 border border-line text-center">
                  <p className="text-caption font-semibold text-danger nums">
                    {formatRupiah(saldoInfo.total_pengeluaran)}
                  </p>
                  <p className="text-caption text-ink-600 mt-0.5">Total Keluar</p>
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              className="w-full mt-3"
              onClick={openPenyesuaianModal}
            >
              Atur / Penyesuaian Kas
            </Button>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col gap-2">
          <Tabs
            tabs={filterTabs}
            active={filterTipe}
            onChange={(k) => {
              setFilterTipe(k as typeof filterTipe);
              setPage(1);
            }}
            variant="pill"
          />
          <div className="flex gap-2">
            <input
              type="month"
              value={filterBulan}
              onChange={(e) => {
                setFilterBulan(e.target.value);
                setPage(1);
              }}
              aria-label="Filter bulan"
              className="flex-1 h-9 rounded-lg border border-line bg-surface px-2 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
            />
            <select
              value={filterKategori}
              onChange={(e) => {
                setFilterKategori(e.target.value);
                setPage(1);
              }}
              aria-label="Filter kategori"
              className="flex-1 h-9 rounded-lg border border-line bg-surface px-2 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
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
          <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-line">
            {list.map((t) => (
              <ListRow
                key={t.id}
                left={
                  <IconTile
                    tint={t.tipe === 'pemasukan' ? 'mint' : 'peach'}
                    icon={t.tipe === 'pemasukan' ? Plus : Minus}
                    size={40}
                  />
                }
                title={formatRupiah(t.nominal)}
                subtitle={
                  [t.keterangan, t.kategori_nama]
                    .filter(Boolean)
                    .join(' · ') || '—'
                }
                right={
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-caption text-ink-400 nums">
                      {new Date(t.dibuat_pada).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                    <Badge
                      label={t.tipe === 'pemasukan' ? 'Masuk' : 'Keluar'}
                      variant={t.tipe === 'pemasukan' ? 'success' : 'danger'}
                    />
                    {t.referensi_tipe === 'penyesuaian_kas' && (
                      <Badge label="Penyesuaian" variant="info" />
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <span className="text-body text-ink-400 nums">
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
      </div>

      {/* FAB — two buttons */}
      <div className="fixed bottom-[120px] right-4 z-30 flex flex-col items-center gap-2.5">
        <IconButton
          icon={Minus}
          label="Tambah pengeluaran"
          variant="filled"
          size="lg"
          onClick={() => openAdd('pengeluaran')}
          className="bg-danger text-white hover:bg-danger/90"
        />
        <IconButton
          icon={Plus}
          label="Tambah pemasukan"
          variant="filled"
          size="lg"
          onClick={() => openAdd('pemasukan')}
        />
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
            <label className="text-body font-medium text-ink-700">Kategori</label>
            <select
              value={addKategori}
              onChange={(e) => setAddKategori(e.target.value)}
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
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
            <p className="text-body text-danger" role="alert">
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
          <Tabs
            tabs={[
              { key: 'set_saldo', label: 'Atur Saldo Fisik (Opname)' },
              { key: 'tambah_kurang', label: 'Tambah / Kurang Saldo' },
            ]}
            active={penyesuaianMode}
            onChange={(k) => setPenyesuaianMode(k as typeof penyesuaianMode)}
            variant="pill"
          />

          {penyesuaianMode === 'set_saldo' ? (
            <div className="flex flex-col gap-3">
              <p className="text-caption text-ink-400 leading-relaxed">
                Masukkan jumlah saldo fisik riil kas saat ini. Sistem akan menghitung penyesuaian otomatis agar saldo kas sama persis.
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
              <div className="bg-primary-100 border border-primary-100 rounded-xl p-3 text-caption flex flex-col gap-1">
                <div className="flex justify-between text-primary-900 font-semibold nums">
                  <span>Target Saldo Kas:</span>
                  <span>{formatRupiah(targetSaldoNum)}</span>
                </div>
                <div className="flex justify-between text-ink-600 nums">
                  <span>Saldo Kas saat ini:</span>
                  <span>{formatRupiah(currentSaldoNum)}</span>
                </div>
                <div className="flex justify-between text-primary-700 border-t border-primary-100 pt-1 mt-0.5 nums">
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
                <label className="text-caption font-medium text-ink-700">
                  Keterangan / Alasan (Opsional)
                </label>
                <input
                  type="text"
                  value={penyesuaianAlasan}
                  onChange={(e) => setPenyesuaianAlasan(e.target.value)}
                  placeholder={`Contoh: Pencatatan sisa fisik kas (${formatRupiah(targetSaldoNum)})`}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-body text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-700"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-caption text-ink-400 leading-relaxed">
                Pilih operasi untuk menambah atau mengurangi saldo kas.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOperasiTipe('-')}
                  className={`flex-1 py-1.5 text-caption font-bold rounded-lg border transition-all ${
                    operasiTipe === '-'
                      ? 'bg-danger-tonal border-danger/30 text-danger'
                      : 'border-line text-ink-600'
                  }`}
                >
                  - Kurang Kas
                </button>
                <button
                  type="button"
                  onClick={() => setOperasiTipe('+')}
                  className={`flex-1 py-1.5 text-caption font-bold rounded-lg border transition-all ${
                    operasiTipe === '+'
                      ? 'bg-tint-mint border-icon-mint/30 text-icon-mint'
                      : 'border-line text-ink-600'
                  }`}
                >
                  + Tambah Kas
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
              <div className="bg-peach-100 border border-line rounded-xl p-3 text-caption flex flex-col gap-1">
                <div className="flex justify-between text-ink-700 nums">
                  <span>Perubahan Kas:</span>
                  <span className="font-bold">{operasiTipe}{formatRupiah(adjNominalNum)}</span>
                </div>
                <div className="flex justify-between text-ink-900 border-t border-line pt-1 mt-0.5 font-semibold nums">
                  <span>Estimasi Saldo Kas Baru:</span>
                  <span className="text-primary-700 font-bold">{formatRupiah(previewNewSaldo)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-caption font-medium text-ink-700">
                  Alasan Penyesuaian (Wajib)
                </label>
                <textarea
                  value={penyesuaianAlasan}
                  onChange={(e) => setPenyesuaianAlasan(e.target.value)}
                  placeholder="Contoh: Selisih uang receh / Uang kas awal bulan"
                  rows={2}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-body text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-primary-700"
                />
              </div>
            </div>
          )}

          {penyesuaianError && (
            <p className="text-body text-danger" role="alert">
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
    <Suspense fallback={<div className="px-5 py-4 text-center text-body text-ink-400">Memuat data kas...</div>}>
      <KasPageInner />
    </Suspense>
  );
}
