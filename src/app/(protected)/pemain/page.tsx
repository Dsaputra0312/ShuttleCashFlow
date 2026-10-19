'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { PemainForm, type PemainFormValues } from '@/components/pemain/PemainForm';
import { formatRupiah } from '@/lib/money';

interface Pemain {
  id: string;
  nama: string;
  no_hp: string | null;
  catatan: string | null;
  bebas_biaya: boolean;
  aktif: boolean;
  is_member?: boolean;
  iuran_id?: string | null;
  iuran_status?: 'lunas' | 'bayar_nanti' | 'gratis' | null;
  iuran_nominal?: number | null;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function PemainPage() {
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();
  const [pemainList, setPemainList] = useState<Pemain[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<PemainFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Quick Iuran / Membership Sheet
  const [iuranSheetOpen, setIuranSheetOpen] = useState(false);
  const [selectedPemainForIuran, setSelectedPemainForIuran] = useState<Pemain | null>(null);
  const [iuranTahun, setIuranTahun] = useState(2026);
  const [iuranBulan, setIuranBulan] = useState(1);
  const [iuranNominal, setIuranNominal] = useState('50000');
  const [iuranStatusMode, setIuranStatusMode] = useState<'lunas' | 'bayar_nanti' | 'gratis'>('lunas');
  const [iuranLoading, setIuranLoading] = useState(false);
  const [iuranError, setIuranError] = useState<string | null>(null);

  // Action loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPemain = useCallback(async (q: string, p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(p),
        per_page: '20',
        ...(q ? { search: q } : {}),
      });
      const res = await fetch(`/api/v1/pemain?${params}`);
      const json = await res.json();
      if (res.ok) {
        setPemainList(json.data as Pemain[]);
        setPagination(json.meta.pagination);
      } else {
        setError(json.message ?? 'Gagal memuat data');
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPemain(search, page);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, page, fetchPemain]);

  const openAdd = () => {
    setSelected(null);
    setSheetOpen(true);
  };

  const openEdit = (p: Pemain) => {
    setSelected(p);
    setSheetOpen(true);
  };

  const openCatatIuran = async (p: Pemain, defaultMode: 'lunas' | 'bayar_nanti' | 'gratis' = 'lunas') => {
    setSelectedPemainForIuran(p);
    setIuranStatusMode(defaultMode);
    const currentDate = new Date();
    setIuranTahun(currentDate.getFullYear());
    setIuranBulan(currentDate.getMonth() + 1);
    setIuranError(null);
    try {
      const confRes = await fetch('/api/v1/konfigurasi');
      const confJson = await confRes.json();
      if (confRes.ok && confJson.data?.iuran_bulanan) {
        setIuranNominal(String(confJson.data.iuran_bulanan));
      } else {
        setIuranNominal('50000');
      }
    } catch {
      setIuranNominal('50000');
    }
    setIuranSheetOpen(true);
  };

  // Instant 1-click Manual Member Tanpa Bayar
  const handleQuickTanpaBayar = async (p: Pemain) => {
    const confirmAction = window.confirm(
      `Jadikan "${p.nama}" sebagai Member Gratis (Tanpa Bayar) untuk bulan ini?`
    );
    if (!confirmAction) return;

    setActionLoadingId(p.id);
    const currentDate = new Date();
    try {
      const res = await fetch('/api/v1/iuran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pemain_id: p.id,
          periode_tahun: currentDate.getFullYear(),
          periode_bulan: currentDate.getMonth() + 1,
          status: 'gratis',
          nominal: 0,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast(`${p.nama} kini berstatus Member (Gratis) untuk bulan ini`, 'success');
        fetchPemain(search, page);
      } else {
        addToast(json.message ?? 'Gagal mencatat membership', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Lunasi Iuran (Bayar Nanti -> Lunas)
  const handleLunasiIuran = async (p: Pemain) => {
    if (!p.iuran_id) return;
    const confirmAction = window.confirm(
      `Konfirmasi pelunasan iuran untuk ${p.nama} (${formatRupiah(p.iuran_nominal ?? 50000)})? Uang akan dicatat masuk ke kas grup.`
    );
    if (!confirmAction) return;

    setActionLoadingId(p.id);
    try {
      const res = await fetch(`/api/v1/iuran/${p.iuran_id}/bayar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok) {
        addToast(`Iuran ${p.nama} berhasil dilunasi & dicatat ke kas!`, 'success');
        fetchPemain(search, page);
      } else {
        addToast(json.message ?? 'Gagal melunasi iuran', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Batalkan Membership / Iuran
  const handleBatalIuran = async (p: Pemain) => {
    if (!p.iuran_id) return;
    const confirmAction = window.confirm(
      `Batalkan membership ${p.nama} untuk bulan ini? Status akan kembali menjadi Non-Member.`
    );
    if (!confirmAction) return;

    setActionLoadingId(p.id);
    try {
      const res = await fetch(`/api/v1/iuran/${p.iuran_id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok) {
        addToast(`Membership ${p.nama} berhasil dibatalkan`, 'success');
        fetchPemain(search, page);
      } else {
        addToast(json.message ?? 'Gagal membatalkan membership', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSimpanIuran = async () => {
    if (!selectedPemainForIuran) return;
    const nom = parseInt(iuranNominal, 10);
    if (iuranStatusMode !== 'gratis' && (isNaN(nom) || nom <= 0)) {
      setIuranError('Nominal harus lebih dari 0');
      return;
    }
    setIuranLoading(true);
    setIuranError(null);
    try {
      const res = await fetch('/api/v1/iuran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pemain_id: selectedPemainForIuran.id,
          periode_tahun: iuranTahun,
          periode_bulan: iuranBulan,
          nominal: iuranStatusMode === 'gratis' ? 0 : nom,
          status: iuranStatusMode,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast(
          json.message ?? `Membership berhasil dicatat untuk ${selectedPemainForIuran.nama}`,
          'success'
        );
        setIuranSheetOpen(false);
        fetchPemain(search, page);
      } else {
        setIuranError(json.message ?? 'Gagal mencatat iuran');
      }
    } catch {
      setIuranError('Terjadi kesalahan jaringan');
    } finally {
      setIuranLoading(false);
    }
  };

  const handleSuccess = () => {
    addToast(selected ? 'Pemain berhasil diperbarui' : 'Pemain berhasil ditambahkan', 'success');
    fetchPemain(search, page);
  };

  return (
    <div className="p-4 pb-24 max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Pemain</h1>

      <Input
        placeholder="Cari nama pemain..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      <div className="mt-4 flex flex-col gap-3">
        {loading ? (
          <SkeletonList count={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchPemain(search, page)} />
        ) : pemainList.length === 0 ? (
          <EmptyState message="Belum ada pemain" hint="Tekan tombol + untuk menambah pemain" />
        ) : (
          pemainList.map((p) => {
            const isLoadingAction = actionLoadingId === p.id;
            return (
              <div
                key={p.id}
                className="w-full bg-white rounded-xl border border-neutral-200/90 shadow-sm p-4 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/pemain/${p.id}`)}
                  >
                    <p className="font-semibold text-neutral-900 truncate hover:text-primary-600 transition-colors">
                      {p.nama}
                    </p>
                    {p.no_hp && (
                      <p className="text-sm text-neutral-500 mt-0.5">{p.no_hp}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    {/* Membership Badge with Status Indicator */}
                    {p.is_member ? (
                      p.iuran_status === 'bayar_nanti' ? (
                        <Badge label="Member (Bayar Nanti)" variant="warning" />
                      ) : p.iuran_status === 'gratis' ? (
                        <Badge label="Member (Gratis)" variant="info" />
                      ) : (
                        <Badge label="Member" variant="success" />
                      )
                    ) : (
                      <Badge label="Non-Member" variant="default" />
                    )}
                    {p.bebas_biaya && <Badge label="Bebas Biaya" variant="info" />}
                    <Badge
                      label={p.aktif ? 'Aktif' : 'Nonaktif'}
                      variant={p.aktif ? 'success' : 'default'}
                    />
                  </div>
                </div>

                {/* Quick Actions Row */}
                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => router.push(`/pemain/${p.id}`)}
                    className="text-xs font-semibold text-primary-600 hover:text-primary-700 py-1 transition-colors"
                  >
                    Detail & Riwayat →
                  </button>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!p.is_member ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openCatatIuran(p, 'lunas')}
                          disabled={isLoadingAction}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60 transition-colors disabled:opacity-50"
                        >
                          + Iuran
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickTanpaBayar(p)}
                          disabled={isLoadingAction}
                          title="Jadikan Member Tanpa Bayar untuk bulan ini"
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 transition-colors disabled:opacity-50"
                        >
                          ⚡ Tanpa Bayar
                        </button>
                      </>
                    ) : p.iuran_status === 'bayar_nanti' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleLunasiIuran(p)}
                          disabled={isLoadingAction}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-colors disabled:opacity-50"
                        >
                          {isLoadingAction ? 'Memproses...' : '💰 Lunasi Iuran'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBatalIuran(p)}
                          disabled={isLoadingAction}
                          title="Batalkan status membership"
                          className="px-2 py-1 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                          Batal
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleBatalIuran(p)}
                        disabled={isLoadingAction}
                        title="Batalkan status membership bulan ini"
                        className="px-2 py-1 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 transition-colors disabled:opacity-50"
                      >
                        Batal Member
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEdit(p)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
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

      {/* FAB Tambah Pemain */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          type="button"
          onClick={openAdd}
          aria-label="Tambah pemain"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 active:bg-primary-700"
        >
          <svg
            className="h-7 w-7"
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

      {/* Tambah/Edit Pemain */}
      <PemainForm
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initial={selected}
        onSuccess={() => {
          setSheetOpen(false);
          handleSuccess();
        }}
      />

      {/* BottomSheet Catat Iuran / Atur Membership */}
      <BottomSheet
        open={iuranSheetOpen}
        onClose={() => setIuranSheetOpen(false)}
        title={`Atur Membership — ${selectedPemainForIuran?.nama ?? ''}`}
      >
        <div className="flex flex-col gap-4">
          {/* Pilihan Opsi Membership */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
              Pilihan Status Membership
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-neutral-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIuranStatusMode('lunas')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all text-center ${
                  iuranStatusMode === 'lunas'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                💳 Lunas
              </button>
              <button
                type="button"
                onClick={() => setIuranStatusMode('bayar_nanti')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all text-center ${
                  iuranStatusMode === 'bayar_nanti'
                    ? 'bg-white text-amber-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                ⏳ Bayar Nanti
              </button>
              <button
                type="button"
                onClick={() => setIuranStatusMode('gratis')}
                className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all text-center ${
                  iuranStatusMode === 'gratis'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                🎁 Tanpa Bayar
              </button>
            </div>
          </div>

          {/* Penjelasan Status */}
          <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl p-3 text-xs text-neutral-600">
            {iuranStatusMode === 'lunas' && (
              <p>
                <strong>Bayar Sekarang:</strong> Uang iuran langsung dicatat masuk ke <strong>Kas Grup</strong>. Status pemain menjadi <strong>Member</strong> dan bebas biaya lapangan.
              </p>
            )}
            {iuranStatusMode === 'bayar_nanti' && (
              <p>
                <strong>Bayar Nanti:</strong> Pemain langsung berstatus <strong>Member</strong> (bebas biaya sewa lapangan saat bermain). Uang iuran dicatat sebagai tagihan dan <strong>belum masuk kas</strong> sampai dilunasi.
              </p>
            )}
            {iuranStatusMode === 'gratis' && (
              <p>
                <strong>Manual Tanpa Bayar:</strong> Pemain dijadikan <strong>Member Gratis (Rp 0)</strong> untuk bulan ini tanpa mencatat uang masuk ke kas.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-neutral-700">Tahun</label>
              <input
                type="number"
                value={iuranTahun}
                onChange={(e) => setIuranTahun(parseInt(e.target.value, 10))}
                min={2020}
                max={2100}
                className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs font-medium text-neutral-700">Bulan</label>
              <select
                value={iuranBulan}
                onChange={(e) => setIuranBulan(parseInt(e.target.value, 10))}
                className="h-10 rounded-lg border border-neutral-300 px-3 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {BULAN.map((nama, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {iuranStatusMode !== 'gratis' && (
            <Input
              label={iuranStatusMode === 'bayar_nanti' ? 'Nominal Tagihan Iuran (Rp)' : 'Nominal Iuran (Rp)'}
              type="number"
              value={iuranNominal}
              onChange={(e) => setIuranNominal(e.target.value)}
              min={1}
              placeholder="50000"
            />
          )}

          {iuranError && (
            <p className="text-sm text-danger-600" role="alert">
              {iuranError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIuranSheetOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleSimpanIuran}
              loading={iuranLoading}
              className="flex-1"
            >
              {iuranStatusMode === 'lunas'
                ? 'Simpan & Masuk Kas'
                : iuranStatusMode === 'bayar_nanti'
                ? 'Simpan (Bayar Nanti)'
                : 'Jadikan Member Gratis'}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
