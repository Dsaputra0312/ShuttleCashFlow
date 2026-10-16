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
  const [iuranNominal, setIuranNominal] = useState('');
  const [iuranLoading, setIuranLoading] = useState(false);
  const [iuranError, setIuranError] = useState<string | null>(null);

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
    if (isNaN(nominal) || nominal <= 0) {
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
          nominal,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Iuran berhasil dicatat', 'success');
        setIuranOpen(false);
        setIuranNominal('');
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

  if (loading) {
    return (
      <div className="p-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!pemain) {
    return (
      <div className="p-4">
        <p className="text-neutral-500">Pemain tidak ditemukan.</p>
        <Link href="/pemain" className="text-primary-600 text-sm mt-2 inline-block">
          ← Kembali
        </Link>
      </div>
    );
  }

  const pemainAsFormValues: PemainFormValues = pemain;

  return (
    <div className="p-4">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push('/pemain')}
        className="text-primary-600 text-sm mb-3"
      >
        ← Kembali
      </button>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-neutral-900">{pemain.nama}</h1>
            {pemain.no_hp && (
              <p className="text-sm text-neutral-500 mt-0.5">{pemain.no_hp}</p>
            )}
            {pemain.catatan && (
              <p className="text-sm text-neutral-400 mt-1 italic">{pemain.catatan}</p>
            )}
          </div>
          <div className="flex flex-col gap-1 items-end">
            {pemain.bebas_biaya && <Badge label="Bebas Biaya" variant="info" />}
            <Badge
              label={isMemberThisMonth ? 'Member' : 'Non-Member'}
              variant={isMemberThisMonth ? 'success' : 'default'}
            />
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={() => setEditOpen(true)}
        >
          Edit Pemain
        </Button>
      </div>

      {/* Iuran section */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-neutral-900">Riwayat Iuran</h2>
        <Button
          size="sm"
          onClick={async () => {
            const d = new Date();
            setIuranTahun(d.getFullYear());
            setIuranBulan(d.getMonth() + 1);
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

      <div className="flex flex-col gap-2">
        {iuranList.map((i) => (
          <div
            key={i.id}
            className="flex items-center justify-between bg-white rounded-xl border border-neutral-200 shadow-sm p-3"
          >
            <div>
              <p className="font-medium text-sm text-neutral-900">
                {BULAN[i.periode_bulan - 1]} {i.periode_tahun}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {new Date(i.dibuat_pada).toLocaleDateString('id-ID')}
              </p>
            </div>
            <p className="font-semibold text-sm text-success-700">
              {formatRupiah(i.nominal)}
            </p>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {iuranPagination && iuranPagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button
            variant="secondary"
            size="sm"
            disabled={iuranPage <= 1}
            onClick={() => setIuranPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-neutral-500">
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
        title="Catat Iuran"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-neutral-700">Tahun</label>
              <input
                type="number"
                value={iuranTahun}
                onChange={(e) => setIuranTahun(parseInt(e.target.value, 10))}
                min={2020}
                max={2100}
                className="h-11 rounded-lg border border-neutral-300 px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-sm font-medium text-neutral-700">Bulan</label>
              <select
                value={iuranBulan}
                onChange={(e) => setIuranBulan(parseInt(e.target.value, 10))}
                className="h-11 rounded-lg border border-neutral-300 px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {BULAN.map((nama, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Nominal"
            type="number"
            value={iuranNominal}
            onChange={(e) => setIuranNominal(e.target.value)}
            min={1}
            placeholder="50000"
          />

          {iuranError && (
            <p className="text-sm text-danger-600" role="alert">
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
              Simpan
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
    <Suspense fallback={<div className="p-4 text-center text-sm text-neutral-500">Memuat...</div>}>
      <PemainDetailPageInner />
    </Suspense>
  );
}
