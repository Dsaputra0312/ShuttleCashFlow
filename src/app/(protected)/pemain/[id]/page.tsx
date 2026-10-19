'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { PageHeader } from '@/components/ui/PageHeader';
import { Avatar } from '@/components/ui/Avatar';
import { ListRow } from '@/components/ui/ListRow';
import { PemainForm, type PemainFormValues } from '@/components/pemain/PemainForm';
import { formatRupiah } from '@/lib/money';

interface Pemain {
  id: string;
  nama: string;
  no_hp: string | null;
  catatan: string | null;
  bebas_biaya: boolean;
  aktif: boolean;
}

interface IuranRow {
  id: string;
  periode_tahun: number;
  periode_bulan: number;
  nominal: number;
  status: 'lunas' | 'bayar_nanti' | 'gratis';
  dibayar_pada?: string | null;
  dibuat_pada: string;
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

function PemainDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();

  const pemainId = params.id;

  const [pemain, setPemain] = useState<Pemain | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMemberThisMonth, setIsMemberThisMonth] = useState(false);
  const [memberStatusThisMonth, setMemberStatusThisMonth] = useState<'lunas' | 'bayar_nanti' | 'gratis' | null>(null);

  // Iuran list
  const [iuranList, setIuranList] = useState<IuranRow[]>([]);
  const [iuranPagination, setIuranPagination] = useState<Pagination | null>(null);
  const [iuranPage, setIuranPage] = useState(1);

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false);

  // Iuran sheet
  const [iuranOpen, setIuranOpen] = useState(false);
  const [iuranTahun, setIuranTahun] = useState(2026);
  const [iuranBulan, setIuranBulan] = useState(1);
  const [iuranNominal, setIuranNominal] = useState('50000');
  const [iuranStatusMode, setIuranStatusMode] = useState<'lunas' | 'bayar_nanti' | 'gratis'>('lunas');
  const [iuranLoading, setIuranLoading] = useState(false);
  const [iuranError, setIuranError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPemain = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/pemain/${pemainId}`);
      const json = await res.json();
      if (res.ok) {
        setPemain(json.data as Pemain);
      } else {
        addToast(json.message ?? 'Gagal memuat pemain', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  }, [pemainId, addToast]);

  const fetchMemberStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/iuran/status?pemain_id=${pemainId}`);
      const json = await res.json();
      if (res.ok) {
        setIsMemberThisMonth(json.data.is_member as boolean);
        setMemberStatusThisMonth(json.data.status ?? (json.data.is_member ? 'lunas' : null));
      }
    } catch {
      // ignore
    }
  }, [pemainId]);

  const fetchIuran = useCallback(
    async (p: number) => {
      try {
        const res = await fetch(
          `/api/v1/pemain/${pemainId}/iuran?page=${p}&per_page=10`
        );
        const json = await res.json();
        if (res.ok) {
          setIuranList(json.data ?? []);
          setIuranPagination(json.meta.pagination);
        }
      } catch {
        // ignore
      }
    },
    [pemainId]
  );

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchPemain();
        fetchMemberStatus();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchPemain, fetchMemberStatus]);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchIuran(iuranPage);
      }
    });
    return () => {
      ignore = true;
    };
  }, [iuranPage, fetchIuran]);

  const handleCatatIuran = async () => {
    const nominal = parseInt(iuranNominal, 10);
    if (iuranStatusMode !== 'gratis' && (isNaN(nominal) || nominal <= 0)) {
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
          pemain_id: pemainId,
          periode_tahun: iuranTahun,
          periode_bulan: iuranBulan,
          nominal: iuranStatusMode === 'gratis' ? 0 : nominal,
          status: iuranStatusMode,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast(json.message ?? 'Membership berhasil dicatat', 'success');
        setIuranOpen(false);
        setIuranNominal('50000');
        fetchIuran(1);
        fetchMemberStatus();
      } else {
        setIuranError(json.message ?? 'Gagal');
      }
    } catch {
      setIuranError('Terjadi kesalahan jaringan');
    } finally {
      setIuranLoading(false);
    }
  };

  const handleLunasiIuran = async (iuranId: string) => {
    setActionLoadingId(iuranId);
    try {
      const res = await fetch(`/api/v1/iuran/${iuranId}/bayar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Iuran berhasil dilunasi & dicatat ke kas', 'success');
        fetchIuran(iuranPage);
        fetchMemberStatus();
      } else {
        addToast(json.message ?? 'Gagal melunasi iuran', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="px-5 py-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!pemain) {
    return (
      <div className="px-5 py-4">
        <p className="text-body text-ink-400">Pemain tidak ditemukan.</p>
        <Link href="/pemain" className="text-primary-700 text-body mt-2 inline-block">
          ← Kembali
        </Link>
      </div>
    );
  }

  const pemainAsFormValues: PemainFormValues = pemain;

  return (
    <div>
      <PageHeader
        title={pemain.nama}
        onBack={() => router.push('/pemain')}
      />

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Profile card */}
        <div className="bg-surface rounded-2xl border border-line shadow-card p-5">
          <div className="flex items-start gap-4">
            <Avatar name={pemain.nama} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-title font-title text-ink-900">{pemain.nama}</h2>
              {pemain.no_hp && (
                <p className="text-body text-ink-600 mt-0.5">{pemain.no_hp}</p>
              )}
              {pemain.catatan && (
                <p className="text-body text-ink-400 mt-1 italic">{pemain.catatan}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {pemain.bebas_biaya && <Badge label="Bebas Biaya" variant="bebas-biaya" />}
                {isMemberThisMonth ? (
                  memberStatusThisMonth === 'bayar_nanti' ? (
                    <Badge label="Member (Bayar Nanti)" variant="warning" />
                  ) : memberStatusThisMonth === 'gratis' ? (
                    <Badge label="Member (Gratis)" variant="info" />
                  ) : (
                    <Badge label="Member" variant="member" />
                  )
                ) : (
                  <Badge label="Non-Member" variant="non-member" />
                )}
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4 w-full"
            onClick={() => setEditOpen(true)}
          >
            Edit Pemain
          </Button>
        </div>

        {/* Iuran section */}
        <div className="flex items-center justify-between">
          <h2 className="text-heading font-semibold text-ink-900">Riwayat Iuran</h2>
          <Button
            size="sm"
            onClick={async () => {
              const currentDate = new Date();
              setIuranTahun(currentDate.getFullYear());
              setIuranBulan(currentDate.getMonth() + 1);
              setIuranStatusMode('lunas');
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
              setIuranOpen(true);
            }}
          >
            + Catat Iuran
          </Button>
        </div>

        {iuranList.length === 0 && (
          <EmptyState
            message="Belum ada iuran"
            hint="Tekan tombol + Catat Iuran untuk mencatat iuran pemain"
          />
        )}

        <div className="flex flex-col gap-0 rounded-xl overflow-hidden border border-line">
          {iuranList.map((i) => (
            <ListRow
              key={i.id}
              title={`${BULAN[i.periode_bulan - 1]} ${i.periode_tahun}`}
              subtitle={
                i.status === 'lunas' && i.dibayar_pada
                  ? `Dibayar: ${new Date(i.dibayar_pada).toLocaleDateString('id-ID')}`
                  : `Dicatat: ${new Date(i.dibuat_pada).toLocaleDateString('id-ID')}`
              }
              right={
                <div className="flex items-center gap-2 shrink-0">
                  <p
                    className={[
                      'text-body font-bold nums',
                      i.status === 'gratis'
                        ? 'text-primary-700'
                        : i.status === 'bayar_nanti'
                        ? 'text-warning'
                        : 'text-icon-mint',
                    ].join(' ')}
                  >
                    {i.status === 'gratis' ? 'Gratis (Rp 0)' : formatRupiah(i.nominal)}
                  </p>
                  <Badge
                    label={
                      i.status === 'bayar_nanti'
                        ? 'Bayar Nanti'
                        : i.status === 'gratis'
                        ? 'Gratis'
                        : 'Lunas'
                    }
                    variant={
                      i.status === 'bayar_nanti'
                        ? 'warning'
                        : i.status === 'gratis'
                        ? 'info'
                        : 'lunas'
                    }
                  />
                  {i.status === 'bayar_nanti' && (
                    <button
                      type="button"
                      onClick={() => handleLunasiIuran(i.id)}
                      disabled={actionLoadingId === i.id}
                      className="px-2.5 py-1 text-caption font-semibold rounded-lg bg-warning text-white hover:bg-warning/90 shadow-card transition-colors disabled:opacity-50"
                    >
                      {actionLoadingId === i.id ? '...' : 'Lunasi'}
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>

        {/* Pagination */}
        {iuranPagination && iuranPagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              disabled={iuranPage <= 1}
              onClick={() => setIuranPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <span className="text-body text-ink-400 nums">
              {iuranPage} / {iuranPagination.total_pages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={iuranPage >= iuranPagination.total_pages}
              onClick={() => setIuranPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        )}
      </div>

      {/* Edit sheet */}
      <PemainForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={pemainAsFormValues}
        onSuccess={() => {
          addToast('Pemain berhasil diperbarui', 'success');
          fetchPemain();
        }}
      />

      {/* Iuran sheet */}
      <BottomSheet
        open={iuranOpen}
        onClose={() => setIuranOpen(false)}
        title="Catat Iuran / Membership"
      >
        <div className="flex flex-col gap-4">
          {/* Pilihan Mode */}
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

          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-body font-medium text-ink-700">Tahun</label>
              <input
                type="number"
                value={iuranTahun}
                onChange={(e) => setIuranTahun(parseInt(e.target.value, 10))}
                min={2020}
                max={2100}
                className="h-11 rounded-lg border border-line bg-surface px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-body font-medium text-ink-700">Bulan</label>
              <select
                value={iuranBulan}
                onChange={(e) => setIuranBulan(parseInt(e.target.value, 10))}
                className="h-11 rounded-lg border border-line bg-surface px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
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
            <p className="text-body text-danger" role="alert">
              {iuranError}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIuranOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button onClick={handleCatatIuran} loading={iuranLoading} className="flex-1">
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

export default function PemainDetailPage() {
  return (
    <Suspense fallback={<div className="px-5 py-4 text-center text-body text-ink-400">Memuat...</div>}>
      <PemainDetailPageInner />
    </Suspense>
  );
}
