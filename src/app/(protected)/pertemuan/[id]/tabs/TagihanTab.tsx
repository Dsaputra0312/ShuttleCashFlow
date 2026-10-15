'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { formatRupiah } from '@/lib/money';

interface Peserta {
  id: string;
  pemain_id: string;
  status_main: 'bermain' | 'selesai' | 'lunas';
  tagihan: number;
  dibayar: number;
  metode_bayar: string | null;
  selesai_pada: string | null;
}

interface PesertaWithNama extends Peserta {
  nama: string;
}

interface TagihanBreakdown {
  biaya_bola: number;
  biaya_lapangan: number;
  pembulatan: number;
  tagihan_total: number;
}

interface TagihanTabProps {
  pertemuanId: string;
  terkunci: boolean;
  onRefresh?: () => void;
}

export function TagihanTab({ pertemuanId, terkunci, onRefresh }: TagihanTabProps) {
  const [pesertaList, setPesertaList] = useState<PesertaWithNama[]>([]);
  const [loading, setLoading] = useState(false);

  // Selesai main sheet
  const [selesaiSheet, setSelesaiSheet] = useState<{
    peserta: PesertaWithNama;
    breakdown?: TagihanBreakdown;
  } | null>(null);
  const [selesaiLoading, setSelesaiLoading] = useState(false);

  // Bayar sheet
  const [bayarSheet, setBayarSheet] = useState<PesertaWithNama | null>(null);
  const [jumlahBayar, setJumlahBayar] = useState('');
  const [metodeBayar, setMetodeBayar] = useState('Cash');
  const [bayarLoading, setBayarLoading] = useState(false);
  const [bayarError, setBayarError] = useState<string | null>(null);

  // Buka kembali sheet
  const [bukaSheet, setBukaSheet] = useState<PesertaWithNama | null>(null);
  const [alasanBuka, setAlasanBuka] = useState('');
  const [bukaLoading, setBukaLoading] = useState(false);
  const [bukaError, setBukaError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Get peserta list
      const [pesertaRes, pemainRes] = await Promise.all([
        fetch(`/api/v1/pertemuan/${pertemuanId}/peserta`),
        fetch(`/api/v1/pertemuan/${pertemuanId}/pemain/last-played?n=100`),
      ]);
      const [pesertaJson, pemainJson] = await Promise.all([
        pesertaRes.json(),
        pemainRes.json(),
      ]);

      const pemainMap = new Map<string, string>();
      if (pemainRes.ok) {
        for (const p of pemainJson.data ?? []) {
          pemainMap.set(p.id, p.nama);
        }
      }

      if (pesertaRes.ok) {
        const list: PesertaWithNama[] = (pesertaJson.data ?? []).map(
          (p: Peserta) => ({
            ...p,
            nama: pemainMap.get(p.pemain_id) ?? 'Pemain',
          })
        );
        setPesertaList(list);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [pertemuanId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelesaiMain = async (peserta: PesertaWithNama) => {
    setSelesaiLoading(true);
    try {
      const res = await fetch(
        `/api/v1/pertemuan/${pertemuanId}/peserta/${peserta.id}/selesai-main`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (res.ok) {
        setSelesaiSheet({ peserta, breakdown: json.data.breakdown });
        fetchData();
        onRefresh?.();
      }
    } catch {
      // ignore
    } finally {
      setSelesaiLoading(false);
    }
  };

  const handleLunas1Ketukan = async (peserta: PesertaWithNama) => {
    setBayarLoading(true);
    try {
      const res = await fetch(
        `/api/v1/pertemuan/${pertemuanId}/peserta/${peserta.id}/bayar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jumlah: peserta.tagihan, metode: 'Cash' }),
        }
      );
      if (res.ok) {
        fetchData();
        onRefresh?.();
      }
    } catch {
      // ignore
    } finally {
      setBayarLoading(false);
    }
  };

  const openBayarSheet = (peserta: PesertaWithNama) => {
    setBayarSheet(peserta);
    setJumlahBayar(String(peserta.tagihan));
    setMetodeBayar('Cash');
    setBayarError(null);
  };

  const handleBayar = async () => {
    if (!bayarSheet) return;
    const jumlah = parseInt(jumlahBayar, 10);
    if (isNaN(jumlah) || jumlah < 0) {
      setBayarError('Jumlah tidak valid');
      return;
    }
    setBayarLoading(true);
    setBayarError(null);
    try {
      const res = await fetch(
        `/api/v1/pertemuan/${pertemuanId}/peserta/${bayarSheet.id}/bayar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jumlah, metode: metodeBayar }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setBayarSheet(null);
        fetchData();
        onRefresh?.();
      } else {
        setBayarError(json.message ?? 'Gagal');
      }
    } catch {
      setBayarError('Terjadi kesalahan jaringan');
    } finally {
      setBayarLoading(false);
    }
  };

  const handleBukaKembali = async () => {
    if (!bukaSheet) return;
    if (!alasanBuka.trim()) {
      setBukaError('Alasan wajib diisi');
      return;
    }
    setBukaLoading(true);
    setBukaError(null);
    try {
      const res = await fetch(
        `/api/v1/pertemuan/${pertemuanId}/peserta/${bukaSheet.id}/buka-kembali`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alasan: alasanBuka }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setBukaSheet(null);
        setAlasanBuka('');
        fetchData();
        onRefresh?.();
      } else {
        setBukaError(json.message ?? 'Gagal');
      }
    } catch {
      setBukaError('Terjadi kesalahan jaringan');
    } finally {
      setBukaLoading(false);
    }
  };

  const statusBadge = (status: Peserta['status_main']) => {
    if (status === 'bermain') return <Badge label="Bermain" variant="default" />;
    if (status === 'selesai') return <Badge label="Selesai" variant="warning" />;
    return <Badge label="Lunas" variant="success" />;
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">Memuat tagihan...</div>
    );
  }

  return (
    <div className="p-4">
      {pesertaList.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-neutral-500 text-sm">Belum ada peserta</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {pesertaList.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 text-sm truncate">
                  {p.nama}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Tagihan: {formatRupiah(p.tagihan)}
                  {p.dibayar > 0 && ` • Dibayar: ${formatRupiah(p.dibayar)}`}
                </p>
              </div>
              {statusBadge(p.status_main)}
            </div>

            {/* Bermain → Selesai Main */}
            {p.status_main === 'bermain' && !terkunci && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full mt-2"
                loading={selesaiLoading}
                onClick={() => handleSelesaiMain(p)}
              >
                Selesai Main
              </Button>
            )}

            {/* Selesai → Bayar / Buka Kembali */}
            {p.status_main === 'selesai' && !terkunci && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  loading={bayarLoading}
                  onClick={() => handleLunas1Ketukan(p)}
                >
                  Lunas 1 Ketukan
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openBayarSheet(p)}
                >
                  Ubah
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setBukaSheet(p);
                    setAlasanBuka('');
                    setBukaError(null);
                  }}
                >
                  Buka
                </Button>
              </div>
            )}

            {/* Lunas → Buka Kembali */}
            {p.status_main === 'lunas' && !terkunci && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => {
                  setBukaSheet(p);
                  setAlasanBuka('');
                  setBukaError(null);
                }}
              >
                Buka Kembali
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Selesai Main result sheet */}
      <BottomSheet
        open={!!selesaiSheet}
        onClose={() => setSelesaiSheet(null)}
        title="Rincian Tagihan"
      >
        {selesaiSheet && (
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-neutral-900">{selesaiSheet.peserta.nama}</p>
            {selesaiSheet.breakdown && (
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600">Biaya Bola</span>
                  <span className="font-medium">{formatRupiah(selesaiSheet.breakdown.biaya_bola)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600">Biaya Lapangan</span>
                  <span className="font-medium">{formatRupiah(selesaiSheet.breakdown.biaya_lapangan)}</span>
                </div>
                {selesaiSheet.breakdown.pembulatan > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Pembulatan</span>
                    <span className="font-medium">{formatRupiah(selesaiSheet.breakdown.pembulatan)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-neutral-100 pt-2 mt-1">
                  <span className="font-semibold text-neutral-900">Total Tagihan</span>
                  <span className="font-bold text-primary-700">{formatRupiah(selesaiSheet.breakdown.tagihan_total)}</span>
                </div>
              </div>
            )}
            <Button onClick={() => setSelesaiSheet(null)}>Tutup</Button>
          </div>
        )}
      </BottomSheet>

      {/* Bayar sheet */}
      <BottomSheet
        open={!!bayarSheet}
        onClose={() => setBayarSheet(null)}
        title="Catat Pembayaran"
      >
        {bayarSheet && (
          <div className="flex flex-col gap-4">
            <p className="font-semibold text-neutral-900">{bayarSheet.nama}</p>
            <p className="text-sm text-neutral-600">
              Tagihan: {formatRupiah(bayarSheet.tagihan)}
            </p>
            <Input
              label="Jumlah Bayar"
              type="number"
              value={jumlahBayar}
              onChange={(e) => setJumlahBayar(e.target.value)}
              min={0}
            />
            <Input
              label="Metode Bayar"
              value={metodeBayar}
              onChange={(e) => setMetodeBayar(e.target.value)}
              placeholder="Contoh: Cash, Transfer"
            />
            {bayarError && (
              <p className="text-sm text-danger-600" role="alert">{bayarError}</p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setBayarSheet(null)} className="flex-1">
                Batal
              </Button>
              <Button onClick={handleBayar} loading={bayarLoading} className="flex-1">
                Bayar
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Buka kembali sheet */}
      <BottomSheet
        open={!!bukaSheet}
        onClose={() => setBukaSheet(null)}
        title="Buka Kembali"
      >
        {bukaSheet && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-neutral-600">
              Pembayaran {bukaSheet.nama} akan direset ke status Bermain.
            </p>
            <Input
              label="Alasan"
              value={alasanBuka}
              onChange={(e) => setAlasanBuka(e.target.value)}
              placeholder="Wajib diisi"
            />
            {bukaError && (
              <p className="text-sm text-danger-600" role="alert">{bukaError}</p>
            )}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setBukaSheet(null)} className="flex-1">
                Batal
              </Button>
              <Button variant="danger" onClick={handleBukaKembali} loading={bukaLoading} className="flex-1">
                Buka Kembali
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
