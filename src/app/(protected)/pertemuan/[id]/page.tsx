'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';
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
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

  // Lock/Unlock
  const [kunciLoading, setKunciLoading] = useState(false);
  const [bukaKunciOpen, setBukaKunciOpen] = useState(false);
  const [alasanBukaKunci, setAlasanBukaKunci] = useState('');
  const [bukaKunciLoading, setBukaKunciLoading] = useState(false);
  const [bukaKunciError, setBukaKunciError] = useState<string | null>(null);

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
    fetchPertemuan();
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

  const setTab = (tab: Tab) => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-sm text-neutral-500">Memuat...</div>
    );
  }

  if (!pertemuan) {
    return (
      <div className="p-4">
        <p className="text-neutral-500">Pertemuan tidak ditemukan.</p>
        <Link href="/pertemuan" className="text-primary-600 text-sm mt-2 inline-block">
          ← Kembali
        </Link>
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
      <div className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            onClick={() => router.push('/pertemuan')}
            className="text-primary-600 text-sm"
          >
            ← Kembali
          </button>
        </div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-neutral-900 text-base leading-tight">
              {formatTanggal(pertemuan.tanggal)}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              {pertemuan.jumlah_peserta} peserta • {pertemuan.jumlah_sesi} sesi
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              label={pertemuan.terkunci ? 'Terkunci' : 'Aktif'}
              variant={pertemuan.terkunci ? 'default' : 'success'}
            />
            {pertemuan.terkunci ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setAlasanBukaKunci('');
                  setBukaKunciError(null);
                  setBukaKunciOpen(true);
                }}
              >
                Buka Kunci
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                loading={kunciLoading}
                onClick={handleKunci}
              >
                Kunci
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-white">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              'flex-1 py-3 text-sm font-medium transition-colors',
              activeTab === t.key
                ? 'border-b-2 border-primary-600 text-primary-700'
                : 'text-neutral-500',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
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
          <p className="text-sm text-neutral-600">
            Masukkan alasan untuk membuka kunci pertemuan ini.
          </p>
          <Input
            label="Alasan"
            value={alasanBukaKunci}
            onChange={(e) => setAlasanBukaKunci(e.target.value)}
            placeholder="Wajib diisi"
          />
          {bukaKunciError && (
            <p className="text-sm text-danger-600" role="alert">
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

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}

function PertemuanDetailPageWrapper() {
  return (
    <Suspense fallback={<div className="p-4 text-center text-sm text-neutral-500">Memuat...</div>}>
      <PertemuanDetailPageInner />
    </Suspense>
  );
}

export default PertemuanDetailPageWrapper;
