'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CirclePlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { PageHeader } from '@/components/ui/PageHeader';
import { SearchField } from '@/components/ui/SearchField';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { Tabs } from '@/components/ui/Tabs';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
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
  const [filterTab, setFilterTab] = useState<'semua' | 'member' | 'non-member'>('semua');
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

  // Confirm popup dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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
  const handleQuickTanpaBayar = (p: Pemain) => {
    setConfirmDialog({
      open: true,
      title: 'Member Gratis (Tanpa Bayar)',
      description: `Jadikan "${p.nama}" sebagai Member Gratis (Tanpa Bayar) untuk bulan ini?`,
      confirmLabel: 'Ya, Jadikan Member',
      destructive: false,
      onConfirm: async () => {
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
      },
    });
  };

  // Lunasi Iuran (Bayar Nanti -> Lunas)
  const handleLunasiIuran = (p: Pemain) => {
    if (!p.iuran_id) return;
    setConfirmDialog({
      open: true,
      title: 'Konfirmasi Pelunasan Iuran',
      description: `Konfirmasi pelunasan iuran untuk ${p.nama} (${formatRupiah(p.iuran_nominal ?? 50000)})? Uang akan dicatat masuk ke kas grup.`,
      confirmLabel: 'Ya, Lunaskan',
      destructive: false,
      onConfirm: async () => {
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
      },
    });
  };

  // Batalkan Membership / Iuran
  const handleBatalIuran = (p: Pemain) => {
    if (!p.iuran_id) return;
    setConfirmDialog({
      open: true,
      title: 'Batalkan Membership',
      description: `Batalkan membership ${p.nama} untuk bulan ini? Status akan kembali menjadi Non-Member.`,
      confirmLabel: 'Batalkan Membership',
      destructive: true,
      onConfirm: async () => {
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
      },
    });
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
    <div>
      <PageHeader title="Pemain" />

      <div className="px-5 py-4 flex flex-col gap-4">
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Cari nama pemain..."
          aria-label="Cari pemain"
        />

        {/* Tab Filter Status */}
        <Tabs
          tabs={[
            { key: 'semua', label: `Semua (${pemainList.length})` },
            { key: 'member', label: `Member (${pemainList.filter((p) => p.is_member).length})` },
            { key: 'non-member', label: `Non-Member (${pemainList.filter((p) => !p.is_member).length})` },
          ]}
          active={filterTab}
          onChange={(k) => setFilterTab(k as typeof filterTab)}
          variant="pill"
        />

        <div className="flex flex-col gap-2.5">
          {loading ? (
            <SkeletonList count={4} />
          ) : error ? (
            <ErrorState message={error} onRetry={() => fetchPemain(search, page)} />
          ) : pemainList.length === 0 ? (
            <EmptyState message="Belum ada pemain" hint="Tekan tombol + untuk menambah pemain" />
          ) : (
            (() => {
              const displayedPemain = pemainList.filter((p) => {
                if (filterTab === 'member') return p.is_member;
                if (filterTab === 'non-member') return !p.is_member;
                return true;
              });

              if (displayedPemain.length === 0) {
                return (
                  <div className="text-center py-8 bg-surface rounded-2xl border border-line p-5">
                    <p className="text-body font-medium text-ink-700">Tidak ada pemain dengan filter ini</p>
                    <p className="text-caption text-ink-400 mt-1">Coba ubah tab atau kata kunci pencarian</p>
                  </div>
                );
              }

              return displayedPemain.map((p) => {
                const isLoadingAction = actionLoadingId === p.id;
                return (
                  <div
                    key={p.id}
                    className="bg-surface rounded-2xl border border-line/80 shadow-xs hover:shadow-card p-3.5 transition-all flex flex-col gap-2.5"
                  >
                    {/* Header info baris pemain */}
                    <div
                      onClick={() => router.push(`/pemain/${p.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          router.push(`/pemain/${p.id}`);
                        }
                      }}
                      className="group flex items-center gap-3 cursor-pointer"
                    >
                      <Avatar name={p.nama} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-heading font-semibold text-ink-900 group-hover:text-primary-700 transition-colors truncate text-heading">
                            {p.nama}
                          </span>
                          {p.is_member ? (
                            p.iuran_status === 'bayar_nanti' ? (
                              <Badge label="Bayar Nanti" variant="warning" />
                            ) : p.iuran_status === 'gratis' ? (
                              <Badge label="Gratis" variant="info" />
                            ) : (
                              <Badge label="Member" variant="member" />
                            )
                          ) : (
                            <Badge label="Non-Member" variant="non-member" />
                          )}
                          {p.bebas_biaya && <Badge label="Bebas Biaya" variant="bebas-biaya" />}
                          {!p.aktif && <Badge label="Nonaktif" variant="non-aktif" />}
                        </div>
                        {p.no_hp && (
                          <p className="text-caption text-ink-500 mt-0.5 truncate">{p.no_hp}</p>
                        )}
                      </div>
                    </div>

                    {/* Tombol Aksi di bagian bawah kartu (Ramping & scannable) */}
                    <div className="flex items-center justify-between pt-2 border-t border-line/40 text-xs">
                      <span className="text-caption text-ink-400 truncate max-w-[130px]">
                        {p.catatan || 'Ketuk untuk detail'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!p.is_member ? (
                          <>
                            <Button
                              size="sm"
                              variant="tonal"
                              className="!py-1 !px-2.5 !text-xs !h-7 font-semibold"
                              onClick={() => openCatatIuran(p, 'lunas')}
                              disabled={isLoadingAction}
                            >
                              + Iuran
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="!py-1 !px-2 !text-xs !h-7 text-ink-600 hover:text-ink-900"
                              onClick={() => handleQuickTanpaBayar(p)}
                              disabled={isLoadingAction}
                              title="Jadikan Member Tanpa Bayar untuk bulan ini"
                            >
                              Gratis
                            </Button>
                          </>
                        ) : p.iuran_status === 'bayar_nanti' ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              className="!py-1 !px-2.5 !text-xs !h-7 font-semibold"
                              onClick={() => handleLunasiIuran(p)}
                              disabled={isLoadingAction}
                            >
                              {isLoadingAction ? '...' : 'Lunasi'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="!py-1 !px-2 !text-xs !h-7 text-ink-600 hover:text-ink-900"
                              onClick={() => handleBatalIuran(p)}
                              disabled={isLoadingAction}
                            >
                              Batal
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="!py-1 !px-2.5 !text-xs !h-7 text-danger hover:bg-danger-surface"
                            onClick={() => handleBatalIuran(p)}
                            disabled={isLoadingAction}
                            title="Batalkan status membership bulan ini"
                          >
                            {isLoadingAction ? '...' : 'Batal Member'}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="tonal"
                          className="!py-1 !px-2.5 !text-xs !h-7"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

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

      {/* FAB Tambah Pemain */}
      <IconButton
        icon={CirclePlus}
        label="Tambah pemain"
        variant="filled"
        size="lg"
        onClick={openAdd}
        className="fixed bottom-[120px] right-4 z-30 shadow-float"
      />

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
            <label className="text-caption font-semibold text-ink-700 uppercase tracking-wider">
              Pilihan Status Membership
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-peach-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIuranStatusMode('lunas')}
                className={`py-2 px-1 text-caption font-semibold rounded-lg transition-all text-center ${
                  iuranStatusMode === 'lunas'
                    ? 'bg-surface text-icon-mint shadow-card'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                Lunas
              </button>
              <button
                type="button"
                onClick={() => setIuranStatusMode('bayar_nanti')}
                className={`py-2 px-1 text-caption font-semibold rounded-lg transition-all text-center ${
                  iuranStatusMode === 'bayar_nanti'
                    ? 'bg-surface text-warning shadow-card'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                Bayar Nanti
              </button>
              <button
                type="button"
                onClick={() => setIuranStatusMode('gratis')}
                className={`py-2 px-1 text-caption font-semibold rounded-lg transition-all text-center ${
                  iuranStatusMode === 'gratis'
                    ? 'bg-surface text-primary-700 shadow-card'
                    : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                Tanpa Bayar
              </button>
            </div>
          </div>

          {/* Penjelasan Status */}
          <div className="bg-peach-100 border border-line rounded-xl p-3 text-caption text-ink-600">
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
              <label className="text-caption font-medium text-ink-700">Tahun</label>
              <input
                type="number"
                value={iuranTahun}
                onChange={(e) => setIuranTahun(parseInt(e.target.value, 10))}
                min={2020}
                max={2100}
                className="h-10 rounded-lg border border-line bg-surface px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-caption font-medium text-ink-700">Bulan</label>
              <select
                value={iuranBulan}
                onChange={(e) => setIuranBulan(parseInt(e.target.value, 10))}
                className="h-10 rounded-lg border border-line bg-surface px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
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
            <CurrencyInput
              label={iuranStatusMode === 'bayar_nanti' ? 'Nominal Tagihan Iuran' : 'Nominal Iuran'}
              value={parseInt(iuranNominal, 10) || 0}
              onChange={(val) => setIuranNominal(String(val))}
              placeholder="0"
              quickAdds={[25000, 50000, 75000, 100000]}
            />
          )}

          {iuranError && (
            <p className="text-body text-danger" role="alert">
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

      {/* Confirm Popup Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          onClose={() => setConfirmDialog(null)}
          onConfirm={async () => {
            setConfirmLoading(true);
            try {
              await confirmDialog.onConfirm();
              setConfirmDialog(null);
            } finally {
              setConfirmLoading(false);
            }
          }}
          title={confirmDialog.title}
          description={confirmDialog.description}
          confirmLabel={confirmDialog.confirmLabel}
          destructive={confirmDialog.destructive}
          loading={confirmLoading}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
