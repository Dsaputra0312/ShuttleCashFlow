'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { HeroCard } from '@/components/ui/HeroCard';
import { StatTile } from '@/components/ui/StatTile';
import { Timeline } from '@/components/ui/Timeline';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Stepper } from '@/components/ui/Stepper';
import { Tabs } from '@/components/ui/Tabs';
import { TintCard } from '@/components/ui/TintCard';
import { AppIcon } from '@/components/ui/AppIcon';
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

  const timelineItems = (stok?.riwayat.data ?? []).map((item) => {
    const formattedDate = new Date(item.dibuat_pada).toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    if (item.tipe === 'pembelian') {
      return {
        icon: ShoppingBag,
        time: formattedDate,
        content: (
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge label="PEMBELIAN" variant="warning" />
                <span className="font-semibold text-caption text-ink-900">
                  Beli {item.jumlah_tabung} Tabung ({item.jumlah_tabung * item.isi_per_tabung} bola)
                </span>
              </div>
            </div>
            <span className="text-caption font-bold text-danger nums whitespace-nowrap">
              {formatRupiah(item.harga_total)}
            </span>
          </div>
        ),
      };
    }

    return {
      icon: Settings2,
      time: formattedDate,
      content: (
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                label="KOREKSI"
                variant={item.jumlah >= 0 ? 'success' : 'danger'}
              />
              <span className="font-semibold text-caption text-ink-900">
                {item.jumlah >= 0 ? '+' : ''}{item.jumlah} bola{' '}
                <span className="font-normal text-ink-400">
                  ({formatStokBola(Math.abs(item.jumlah))})
                </span>
              </span>
            </div>
            {item.alasan && (
              <p className="text-caption text-ink-600 mt-1 font-medium">{item.alasan}</p>
            )}
          </div>
        </div>
      ),
    };
  });

  return (
    <div>
      <PageHeader
        title="Stok Bola"
        onBack={() => router.push('/lainnya')}
      />

      <div className="p-4 max-w-xl mx-auto">
        {/* Stok Utama HeroCard */}
        {loading ? (
          <div className="rounded-2xl bg-primary-700 p-5 h-28 animate-pulse mb-4" />
        ) : (
          <HeroCard
            title="SISA BOLA SAAT INI"
            value={stok?.stok_saat_ini_formatted ?? formatStokBola(stok?.stok_saat_ini ?? 0)}
            subtitle={`Total ${stok?.stok_saat_ini ?? 0} biji bola tersisa (1 Tabung = 12 Biji)`}
            className="mb-4"
          />
        )}

        {/* StatTile 3 kolom */}
        {stok && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <StatTile
              label={`Dibeli (${stok.total_pembelian_bola} bola)`}
              value={`${stok.total_pembelian_tabung ?? Math.floor(stok.total_pembelian_bola / 12)} Tabung`}
            />
            <StatTile
              label="Terpakai di sesi"
              value={`${stok.total_terpakai} Biji`}
            />
            <StatTile
              label="Penyesuaian"
              value={`${stok.total_koreksi >= 0 ? '+' : ''}${stok.total_koreksi} Biji`}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <Button
            variant="tonal"
            className="flex-1 font-semibold flex items-center justify-center gap-2"
            onClick={() => {
              setBeliTabung(1);
              setBeliHarga('');
              setBeliError(null);
              setBeliOpen(true);
            }}
          >
            <AppIcon icon={ShoppingBag} size="sm" />
            Beli Bola (Tabung)
          </Button>
          <Button
            variant="tonal"
            className="flex-1 font-semibold flex items-center justify-center gap-2"
            onClick={openKoreksiModal}
          >
            <AppIcon icon={Settings2} size="sm" />
            Atur / Koreksi Stok
          </Button>
        </div>

        {/* Riwayat */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-heading text-ink-900">Riwayat Pergerakan Stok</h2>
          <span className="text-caption text-ink-400">
            {pagination?.total ?? 0} catatan
          </span>
        </div>

        {loading && <SkeletonList count={3} />}

        {!loading && timelineItems.length === 0 && (
          <EmptyState
            message="Belum ada riwayat"
            hint="Riwayat pembelian bola dan koreksi fisik akan tercatat di sini"
          />
        )}

        {!loading && timelineItems.length > 0 && (
          <Card padding className="mb-4">
            <Timeline items={timelineItems} />
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4 mb-6">
            <Button
              variant="tonal"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <span className="text-caption font-medium text-ink-600">
              {page} / {pagination.total_pages}
            </span>
            <Button
              variant="tonal"
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
            <TintCard variant="peach" className="p-3 text-caption text-ink-600">
              <p className="font-semibold text-ink-900 mb-0.5">Ketentuan Pembelian</p>
              <p>
                Pembelian bola dihitung per tabung. 1 Tabung = <strong>12 biji bola</strong>.
                Pengeluaran kas otomatis dicatat.
              </p>
            </TintCard>

            <Stepper
              label="Jumlah Tabung"
              value={beliTabung}
              onChange={setBeliTabung}
              min={1}
            />
            <p className="text-caption text-primary-700 font-semibold -mt-2">
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
              <p className="text-caption text-danger" role="alert">
                {beliError}
              </p>
            )}

            <div className="flex gap-3 mt-1">
              <Button variant="ghost" onClick={() => setBeliOpen(false)} className="flex-1">
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
            <Tabs
              tabs={[
                { key: 'set_stok', label: 'Atur Sisa Fisik' },
                { key: 'tambah_kurang', label: 'Tambah / Kurang' },
              ]}
              active={koreksiMode}
              onChange={(k) => setKoreksiMode(k as 'set_stok' | 'tambah_kurang')}
              variant="pill"
              className="w-full"
            />

            {koreksiMode === 'set_stok' ? (
              <div className="flex flex-col gap-3">
                <p className="text-caption text-ink-600 leading-relaxed">
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
                <TintCard variant="lavender" className="p-3 text-caption flex flex-col gap-1">
                  <div className="flex justify-between text-ink-900 font-semibold">
                    <span>Target Sisa Stok:</span>
                    <span>{formatStokBola(previewTargetBiji)}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Stok saat ini:</span>
                    <span>{formatStokBola(stok?.stok_saat_ini ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-primary-700 border-t border-line pt-1 mt-0.5">
                    <span>Penyesuaian yang dicatat:</span>
                    <span className="font-bold">
                      {previewDiff >= 0 ? `+${previewDiff}` : previewDiff} bola
                    </span>
                  </div>
                </TintCard>

                <Input
                  label="Keterangan / Alasan (Opsional)"
                  type="text"
                  value={koreksiAlasan}
                  onChange={(e) => setKoreksiAlasan(e.target.value)}
                  placeholder={`Contoh: Pencatatan sisa fisik (${setTabung} Tabung ${setBiji} Biji)`}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-caption text-ink-600 leading-relaxed">
                  Pilih operasi untuk menambah (misal bonus/hibah) atau mengurangi stok bola (misal rusak/hilang).
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOperasiTipe('-')}
                    className={[
                      'flex-1 py-2 px-3 text-caption font-bold rounded-lg border transition-all',
                      operasiTipe === '-'
                        ? 'bg-danger-tonal border-danger text-danger'
                        : 'border-line text-ink-600 bg-surface',
                    ].join(' ')}
                  >
                    - Kurang Stok (Rusak/Hilang)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOperasiTipe('+')}
                    className={[
                      'flex-1 py-2 px-3 text-caption font-bold rounded-lg border transition-all',
                      operasiTipe === '+'
                        ? 'bg-tint-mint border-tint-mint text-icon-mint'
                        : 'border-line text-ink-600 bg-surface',
                    ].join(' ')}
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
                <TintCard variant="lavender" className="p-3 text-caption flex flex-col gap-1">
                  <div className="flex justify-between text-ink-600">
                    <span>Perubahan:</span>
                    <span className="font-bold">
                      {operasiTipe}{previewAdjTotalBiji} biji ({operasiTipe}{formatStokBola(previewAdjTotalBiji)})
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-900 border-t border-line pt-1 mt-0.5 font-semibold">
                    <span>Estimasi sisa stok baru:</span>
                    <span className="text-primary-700 font-bold">{formatStokBola(previewNewTotal)}</span>
                  </div>
                </TintCard>

                <Textarea
                  label="Alasan Penyesuaian (Wajib)"
                  value={koreksiAlasan}
                  onChange={(e) => setKoreksiAlasan(e.target.value)}
                  placeholder="Contoh: 2 biji bola penyok / rusak saat sesi main"
                  rows={2}
                />
              </div>
            )}

            {koreksiError && (
              <p className="text-caption text-danger" role="alert">
                {koreksiError}
              </p>
            )}

            <div className="flex gap-3 mt-1">
              <Button variant="ghost" onClick={() => setKoreksiOpen(false)} className="flex-1">
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
    </div>
  );
}

export default function StokPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-caption text-ink-400">Memuat...</div>}>
      <StokPageInner />
    </Suspense>
  );
}
