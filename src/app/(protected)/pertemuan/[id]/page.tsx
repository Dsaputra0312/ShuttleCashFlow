'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, LockOpen, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconButton } from '@/components/ui/IconButton';
import { Tabs } from '@/components/ui/Tabs';
import { RekapWhatsAppSheet } from '@/components/pertemuan/RekapWhatsAppSheet';
import { SesiTab } from './tabs/SesiTab';
import { TagihanTab } from './tabs/TagihanTab';
import { PengeluaranTab } from './tabs/PengeluaranTab';

type Tab = 'sesi' | 'tagihan' | 'pengeluaran';

interface Pertemuan {
  id: string;
  tanggal: string;
  terkunci: boolean;
  jumlah_sesi: number;
  jumlah_peserta: number;
}

function formatTanggal(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTanggalSingkat(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function PertemuanDetailPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toasts, addToast, dismiss } = useToast();

  const pertemuanId = params.id;
  const activeTab = (searchParams.get('tab') as Tab) ?? 'sesi';

  const [pertemuan, setPertemuan] = useState<Pertemuan | null>(null);
  const [loading, setLoading] = useState(true);

  // Salin & Bagikan Rekap WA
  const [rekapLoading, setRekapLoading] = useState(false);
  const [rekapSheetOpen, setRekapSheetOpen] = useState(false);
  const [rekapTeks, setRekapTeks] = useState('');

  // Lock/Unlock
  const [kunciLoading, setKunciLoading] = useState(false);
  const [bukaKunciOpen, setBukaKunciOpen] = useState(false);
  const [alasanBukaKunci, setAlasanBukaKunci] = useState('');
  const [bukaKunciLoading, setBukaKunciLoading] = useState(false);
  const [bukaKunciError, setBukaKunciError] = useState<string | null>(null);

  // Ubah Tanggal
  const [editTanggalOpen, setEditTanggalOpen] = useState(false);
  const [editTanggal, setEditTanggal] = useState('');
  const [editTanggalLoading, setEditTanggalLoading] = useState(false);
  const [editTanggalError, setEditTanggalError] = useState<string | null>(null);

  const fetchPertemuan = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}`);
      const json = await res.json();
      if (res.ok) {
        setPertemuan(json.data as Pertemuan);
      } else {
        addToast(json.message ?? 'Gagal memuat pertemuan', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  }, [pertemuanId, addToast]);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchPertemuan();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchPertemuan]);

  const handleKunci = async () => {
    setKunciLoading(true);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/kunci`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Pertemuan berhasil dikunci', 'success');
        fetchPertemuan();
      } else {
        addToast(json.message ?? 'Gagal mengunci', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setKunciLoading(false);
    }
  };

  const handleBukaKunci = async () => {
    if (!alasanBukaKunci.trim()) {
      setBukaKunciError('Alasan wajib diisi');
      return;
    }
    setBukaKunciLoading(true);
    setBukaKunciError(null);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/buka-kunci`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alasan: alasanBukaKunci }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Pertemuan berhasil dibuka', 'success');
        setBukaKunciOpen(false);
        setAlasanBukaKunci('');
        fetchPertemuan();
      } else {
        setBukaKunciError(json.message ?? 'Gagal membuka kunci');
      }
    } catch {
      setBukaKunciError('Terjadi kesalahan jaringan');
    } finally {
      setBukaKunciLoading(false);
    }
  };

  const handleUpdateTanggal = async () => {
    if (!editTanggal) {
      setEditTanggalError('Tanggal wajib diisi');
      return;
    }
    setEditTanggalLoading(true);
    setEditTanggalError(null);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanggal: editTanggal }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Tanggal pertemuan berhasil diperbarui', 'success');
        setEditTanggalOpen(false);
        fetchPertemuan();
      } else {
        setEditTanggalError(json.message ?? 'Gagal memperbarui tanggal');
      }
    } catch {
      setEditTanggalError('Terjadi kesalahan jaringan');
    } finally {
      setEditTanggalLoading(false);
    }
  };

  const handleBukaRekap = async () => {
    setRekapLoading(true);
    setRekapSheetOpen(true);
    try {
      const res = await fetch(`/api/v1/pertemuan/${pertemuanId}/rekap`);
      const json = await res.json();
      if (res.ok && json.data?.teks) {
        setRekapTeks(json.data.teks);
      } else {
        addToast(json.message ?? 'Gagal memuat rekap', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan memuat rekap', 'error');
    } finally {
      setRekapLoading(false);
    }
  };

  const setTab = (tab: Tab) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search);
  };

  if (loading) {
    return (
      <div className="px-5 py-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  if (!pertemuan) {
    return (
      <div className="px-5 py-4">
        <EmptyState
          message="Pertemuan tidak ditemukan"
          hint="Pertemuan mungkin telah dihapus"
        />
        <div className="text-center mt-4">
          <Link href="/pertemuan" className="text-primary-700 text-body inline-block">
            ← Kembali
          </Link>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sesi', label: 'Sesi' },
    { key: 'tagihan', label: 'Tagihan' },
    { key: 'pengeluaran', label: 'Pengeluaran' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <PageHeader
        title={formatTanggalSingkat(pertemuan.tanggal)}
        onBack={() => router.push('/pertemuan')}
        action={
          <div className="flex items-center gap-1">
            <IconButton
              icon={Share2}
              label="Rekap WhatsApp"
              variant="ghost"
              size="sm"
              onClick={handleBukaRekap}
              disabled={rekapLoading}
            />
            {pertemuan.terkunci ? (
              <IconButton
                icon={LockOpen}
                label="Buka kunci"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAlasanBukaKunci('');
                  setBukaKunciError(null);
                  setBukaKunciOpen(true);
                }}
              />
            ) : (
              <IconButton
                icon={Lock}
                label="Kunci pertemuan"
                variant="ghost"
                size="sm"
                onClick={handleKunci}
                disabled={kunciLoading}
              />
            )}
          </div>
        }
      />

      {/* Sub-header info */}
      <div className="bg-surface border-b border-line px-5 py-2 flex items-center justify-between gap-2">
        <p className="text-caption text-ink-600">
          {pertemuan.jumlah_peserta} peserta · {pertemuan.jumlah_sesi} sesi
        </p>
        <div className="flex items-center gap-2">
          <Badge
            label={pertemuan.terkunci ? 'Terkunci' : 'Aktif'}
            variant={pertemuan.terkunci ? 'terkunci' : 'aktif'}
          />
          {!pertemuan.terkunci && (
            <button
              type="button"
              onClick={() => {
                setEditTanggal(pertemuan.tanggal);
                setEditTanggalError(null);
                setEditTanggalOpen(true);
              }}
              className="text-caption px-2 py-0.5 rounded border border-line text-ink-600 hover:text-ink-900 hover:bg-peach-100"
            >
              Ubah
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface border-b border-line px-5 py-2">
        <Tabs
          tabs={tabs}
          active={activeTab}
          onChange={(k) => setTab(k as Tab)}
          variant="underline"
        />
      </div>

      {/* Tab content */}
      <div className="flex-1">
        {activeTab === 'sesi' && (
          <SesiTab
            pertemuanId={pertemuanId}
            terkunci={pertemuan.terkunci}
            onRefresh={fetchPertemuan}
          />
        )}
        {activeTab === 'tagihan' && (
          <TagihanTab
            pertemuanId={pertemuanId}
            terkunci={pertemuan.terkunci}
            onRefresh={fetchPertemuan}
          />
        )}
        {activeTab === 'pengeluaran' && (
          <PengeluaranTab
            pertemuanId={pertemuanId}
            terkunci={pertemuan.terkunci}
          />
        )}
      </div>

      {/* Buka kunci modal */}
      <BottomSheet
        open={bukaKunciOpen}
        onClose={() => setBukaKunciOpen(false)}
        title="Buka Kunci Pertemuan"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body text-ink-600">
            Masukkan alasan untuk membuka kunci pertemuan ini.
          </p>
          <Input
            label="Alasan"
            value={alasanBukaKunci}
            onChange={(e) => setAlasanBukaKunci(e.target.value)}
            placeholder="Wajib diisi"
          />
          {bukaKunciError && (
            <p className="text-body text-danger" role="alert">
              {bukaKunciError}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setBukaKunciOpen(false)}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleBukaKunci}
              loading={bukaKunciLoading}
              className="flex-1"
            >
              Buka Kunci
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Ubah tanggal modal */}
      <BottomSheet
        open={editTanggalOpen}
        onClose={() => !editTanggalLoading && setEditTanggalOpen(false)}
        title="Ubah Tanggal Pertemuan"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Tanggal Pertemuan"
            type="date"
            value={editTanggal}
            onChange={(e) => setEditTanggal(e.target.value)}
            error={editTanggalError ?? undefined}
            required
          />
          <div className="p-3 bg-peach-100 rounded-xl border border-line flex items-center justify-between">
            <span className="text-caption text-ink-600">Pilihan:</span>
            <span className="text-body font-medium text-ink-900">
              {formatTanggal(editTanggal)}
            </span>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setEditTanggalOpen(false)}
              disabled={editTanggalLoading}
              className="flex-1"
            >
              Batal
            </Button>
            <Button
              onClick={handleUpdateTanggal}
              loading={editTanggalLoading}
              disabled={!editTanggal || editTanggal === pertemuan.tanggal}
              className="flex-1"
            >
              Simpan
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* WhatsApp Rekap Sheet */}
      <RekapWhatsAppSheet
        open={rekapSheetOpen}
        onClose={() => setRekapSheetOpen(false)}
        teks={rekapTeks}
        loading={rekapLoading}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function PertemuanDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="px-5 py-4 text-center text-body text-ink-400">Memuat...</div>}>
      <PertemuanDetailPageInner />
    </Suspense>
  );
}

export default PertemuanDetailPageWrapper;
