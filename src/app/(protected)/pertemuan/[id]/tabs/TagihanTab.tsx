'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs } from '@/components/ui/Tabs';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatRupiah } from '@/lib/money';

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface SesiDetail {
  sesi_id: string;
  sesi_ke: number;
  lapangan: string | number;
  bola_terpakai: number;
  bola_terpakai_pemain?: number;
  is_draft: boolean;
  total_pemain: number;
  total_non_members?: number;
  is_bearer: boolean;
  bearer_nama: string | null;
  biaya_bola_pemain: number;
}

interface TagihanBreakdown {
  biaya_bola: number;
  biaya_lapangan: number;
  pembulatan: number;
  tagihan_total: number;
  jumlah_sesi?: number;
  harga_bola_per_biji?: number;
  biaya_lapangan_non_member?: number;
  sesi_details?: SesiDetail[];
}

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
  has_active_draft_session?: boolean;
  active_draft_lapangan?: string | number;
  is_member?: boolean;
  bebas_biaya?: boolean;
  breakdown?: TagihanBreakdown;
}

interface TagihanTabProps {
  pertemuanId: string;
  terkunci: boolean;
  onRefresh?: () => void;
}

export function TagihanTab({ pertemuanId, terkunci, onRefresh }: TagihanTabProps) {
  const [pesertaList, setPesertaList] = useState<PesertaWithNama[]>([]);
  const [loading, setLoading] = useState(false);
  const [selesaiLoadingId, setSelesaiLoadingId] = useState<string | null>(null);

  // Rincian Tagihan & Bayar Sheet
  const [rincianSheet, setRincianSheet] = useState<{
    peserta: PesertaWithNama;
    breakdown: TagihanBreakdown;
  } | null>(null);
  const [metodeTipe, setMetodeTipe] = useState<'cash' | 'transfer'>('cash');
  const [jenisTransfer, setJenisTransfer] = useState('GoPay');
  const [customTransfer, setCustomTransfer] = useState('');
  const [jumlahBayar, setJumlahBayar] = useState('');
  const [bayarLoading, setBayarLoading] = useState(false);
  const [bayarError, setBayarError] = useState<string | null>(null);

  // Quick Iuran Sheet in Tagihan
  const [iuranSheetOpen, setIuranSheetOpen] = useState(false);
  const [iuranPeserta, setIuranPeserta] = useState<PesertaWithNama | null>(null);
  const [iuranTahun, setIuranTahun] = useState(2026);
  const [iuranBulan, setIuranBulan] = useState(1);
  const [iuranNominal, setIuranNominal] = useState('50000');
  const [iuranLoading, setIuranLoading] = useState(false);
  const [iuranError, setIuranError] = useState<string | null>(null);

  // Quick Filter & Bulk Pay
  const [filterTab, setFilterTab] = useState<'semua' | 'belum_bayar' | 'lunas'>('semua');
  const [bulkBayarOpen, setBulkBayarOpen] = useState(false);
  const [bulkBayarLoading, setBulkBayarLoading] = useState(false);

  // Buka kembali sheet
  const [bukaSheet, setBukaSheet] = useState<PesertaWithNama | null>(null);
  const [alasanBuka, setAlasanBuka] = useState('');
  const [bukaLoading, setBukaLoading] = useState(false);
  const [bukaError, setBukaError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<PesertaWithNama[] | null> => {
    setLoading(true);
    try {
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
          (p: PesertaWithNama) => ({
            ...p,
            nama: p.nama || pemainMap.get(p.pemain_id) || 'Pemain',
          })
        );
        setPesertaList(list);
        return list;
      }
      return null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [pertemuanId]);

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchData]);

  const openRincianSheet = (peserta: PesertaWithNama, customBreakdown?: TagihanBreakdown) => {
    const bd: TagihanBreakdown = customBreakdown ?? peserta.breakdown ?? {
      biaya_bola: 0,
      biaya_lapangan: 0,
      pembulatan: 0,
      tagihan_total: peserta.tagihan,
      sesi_details: [],
    };
    setRincianSheet({ peserta, breakdown: bd });
    setMetodeTipe('cash');
    setJenisTransfer('GoPay');
    setCustomTransfer('');
    setJumlahBayar(String(bd.tagihan_total ?? peserta.tagihan ?? 0));
    setBayarError(null);
  };

  const openIuranSheetForPeserta = async (peserta: PesertaWithNama) => {
    setIuranPeserta(peserta);
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

  const handleSimpanIuranFromTagihan = async () => {
    if (!iuranPeserta) return;
    const nom = parseInt(iuranNominal, 10);
    if (isNaN(nom) || nom <= 0) {
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
          pemain_id: iuranPeserta.pemain_id,
          periode_tahun: iuranTahun,
          periode_bulan: iuranBulan,
          nominal: nom,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setIuranSheetOpen(false);
        const updatedList = await fetchData();
        onRefresh?.();
        // If rincian sheet was open for this player, update it with recalculated numbers
        if (updatedList) {
          const updated = updatedList.find(
            (p) => p.pemain_id === iuranPeserta.pemain_id
          );
          if (updated) {
            openRincianSheet(updated);
          }
        }
      } else {
        setIuranError(json.message ?? 'Gagal mencatat iuran');
      }
    } catch {
      setIuranError('Terjadi kesalahan jaringan');
    } finally {
      setIuranLoading(false);
    }
  };

  const handleSelesaiMain = async (peserta: PesertaWithNama) => {
    if (peserta.has_active_draft_session) return;
    setSelesaiLoadingId(peserta.id);
    try {
      const res = await fetch(
        `/api/v1/pertemuan/${pertemuanId}/peserta/${peserta.id}/selesai-main`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (res.ok) {
        const breakdown = json.data.breakdown;
        const updatedPeserta: PesertaWithNama = {
          ...peserta,
          status_main: 'selesai',
          tagihan: json.data.tagihan,
          breakdown,
        };
        openRincianSheet(updatedPeserta, breakdown);
        fetchData();
        onRefresh?.();
      }
    } catch {
      // ignore
    } finally {
      setSelesaiLoadingId(null);
    }
  };

  const computedMetode =
    metodeTipe === 'cash'
      ? 'Cash'
      : jenisTransfer === 'Lainnya' && customTransfer.trim()
      ? `Transfer - ${customTransfer.trim()}`
      : `Transfer - ${jenisTransfer}`;

  const handleBayarFromSheet = async () => {
    if (!rincianSheet) return;
    const { peserta, breakdown } = rincianSheet;
    const jumlah = parseInt(jumlahBayar, 10);
    if (isNaN(jumlah) || jumlah < 0) {
      setBayarError('Jumlah bayar tidak valid');
      return;
    }
    if (breakdown.tagihan_total > 0 && jumlah < breakdown.tagihan_total) {
      setBayarError(
        `Jumlah bayar (${formatRupiah(jumlah)}) kurang dari tagihan (${formatRupiah(breakdown.tagihan_total)})`
      );
      return;
    }

    setBayarLoading(true);
    setBayarError(null);
    try {
      const res = await fetch(
        `/api/v1/pertemuan/${pertemuanId}/peserta/${peserta.id}/bayar`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jumlah, metode: computedMetode }),
        }
      );
      const json = await res.json();
      if (res.ok) {
        setRincianSheet(null);
        fetchData();
        onRefresh?.();
      } else {
        setBayarError(json.message ?? 'Gagal memproses pembayaran');
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

  // Summary Calculations
  const totalTagihan = pesertaList.reduce((acc, p) => acc + (p.tagihan || 0), 0);
  const totalKelebihan = pesertaList
    .filter((p) => p.status_main === 'lunas')
    .reduce((acc, p) => acc + Math.max(0, (p.dibayar || 0) - (p.tagihan || 0)), 0);
  const totalTagihanLunas = pesertaList
    .filter((p) => p.status_main === 'lunas')
    .reduce((acc, p) => acc + (p.tagihan || 0), 0);
  const totalTerkumpul = pesertaList
    .filter((p) => p.status_main === 'lunas')
    .reduce((acc, p) => acc + (p.dibayar || p.tagihan || 0), 0);
  const totalBelumBayar = pesertaList
    .filter((p) => p.status_main !== 'lunas')
    .reduce((acc, p) => acc + (p.tagihan || 0), 0);
  const countBelumBayar = pesertaList.filter((p) => p.status_main !== 'lunas').length;
  const countLunas = pesertaList.filter((p) => p.status_main === 'lunas').length;

  // Filtered list
  const filteredPesertaList = pesertaList.filter((p) => {
    if (filterTab === 'belum_bayar') return p.status_main !== 'lunas';
    if (filterTab === 'lunas') return p.status_main === 'lunas';
    return true;
  });

  // Eligible for Bulk Bayar (not lunas and not in active draft session)
  const eligibleBulkPeserta = pesertaList.filter(
    (p) => p.status_main !== 'lunas' && !p.has_active_draft_session
  );
  const skippedDraftCount = pesertaList.filter(
    (p) => p.status_main !== 'lunas' && p.has_active_draft_session
  ).length;
  const totalEligibleTagihan = eligibleBulkPeserta.reduce(
    (acc, p) => acc + (p.tagihan || 0),
    0
  );

  const handleBulkBayarCash = async () => {
    if (eligibleBulkPeserta.length === 0) return;
    setBulkBayarLoading(true);
    try {
      const promises = eligibleBulkPeserta.map((p) =>
        fetch(`/api/v1/pertemuan/${pertemuanId}/peserta/${p.id}/bayar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jumlah: p.tagihan, metode: 'Cash' }),
        })
      );
      await Promise.allSettled(promises);
      setBulkBayarOpen(false);
      await fetchData();
      onRefresh?.();
    } catch {
      // ignore
    } finally {
      setBulkBayarLoading(false);
    }
  };

  const statusBadge = (status: Peserta['status_main']) => {
    if (status === 'bermain') return <Badge label="Bermain" variant="bermain" />;
    if (status === 'selesai') return <Badge label="Selesai" variant="selesai" />;
    return <Badge label="Lunas" variant="lunas" />;
  };

  if (loading && pesertaList.length === 0) {
    return (
      <div className="px-5 py-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="px-5 py-4 flex flex-col gap-4">
      {/* Financial Summary Tiles */}
      {pesertaList.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {/* Terkumpul */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-emerald-800">
                Terkumpul
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-full">
                {countLunas} Lunas
              </span>
            </div>
            <div className="mt-2.5">
              <p className="font-heading font-extrabold text-[17px] text-emerald-950 tracking-tight leading-tight">
                {formatRupiah(totalTerkumpul)}
              </p>
              <p className="text-[11px] text-emerald-700/90 mt-1">
                {totalKelebihan > 0
                  ? `Tagihan ${formatRupiah(totalTagihanLunas)} + Lebih ${formatRupiah(totalKelebihan)}`
                  : `dari ${formatRupiah(totalTagihan)}`}
              </p>
            </div>
          </div>

          {/* Belum Bayar */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-caption font-semibold text-rose-800">
                Belum Bayar
              </span>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100/90 px-2 py-0.5 rounded-full">
                {countBelumBayar} Orang
              </span>
            </div>
            <div className="mt-2.5">
              <p className="font-heading font-extrabold text-[17px] text-rose-950 tracking-tight leading-tight">
                {formatRupiah(totalBelumBayar)}
              </p>
              <p className="text-[11px] text-rose-700/90 mt-1">
                {countBelumBayar > 0 ? 'Menunggu penagihan' : 'Semua lunas! 🎉'}
              </p>
            </div>
          </div>

          {/* Banner Kelebihan Bayar jika ada */}
          {totalKelebihan > 0 && (
            <div className="col-span-2 bg-emerald-100/70 border border-emerald-200/90 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-caption text-emerald-950">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                Pemasukan Kelebihan Bayar:
              </span>
              <span className="font-bold nums text-emerald-800">
                +{formatRupiah(totalKelebihan)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter Tabs & Bulk Action */}
      {pesertaList.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <Tabs
            tabs={[
              { key: 'semua', label: `Semua (${pesertaList.length})` },
              { key: 'belum_bayar', label: `Belum (${countBelumBayar})` },
              { key: 'lunas', label: `Lunas (${countLunas})` },
            ]}
            active={filterTab}
            onChange={(k) => setFilterTab(k as 'semua' | 'belum_bayar' | 'lunas')}
            variant="pill"
          />

          {!terkunci && countBelumBayar > 0 && (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="tonal"
                onClick={() => setBulkBayarOpen(true)}
                className="!text-xs !py-1.5 !px-3 font-semibold text-primary-700 border border-primary-200 hover:bg-primary-50"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5 text-primary-700" />
                Tandai Semua Lunas (Cash)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Peserta List */}
      {filteredPesertaList.length === 0 ? (
        <EmptyState
          message={
            pesertaList.length === 0
              ? 'Belum ada peserta'
              : filterTab === 'belum_bayar'
              ? 'Semua tagihan sudah lunas!'
              : 'Belum ada peserta yang lunas'
          }
          hint={
            pesertaList.length === 0
              ? 'Peserta akan muncul setelah ditambahkan ke sesi'
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filteredPesertaList.map((p) => (
          <div
            key={p.id}
            className="bg-surface rounded-2xl border border-line/80 shadow-card p-4 transition-all hover:shadow-float"
          >
            {/* Header info peserta */}
            <div
              onClick={() => openRincianSheet(p)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  openRincianSheet(p);
                }
              }}
              className="group flex items-center gap-3.5 cursor-pointer"
            >
              <Avatar name={p.nama} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-ink-900 group-hover:text-primary-700 transition-colors truncate text-[15px]">
                  {p.nama}
                </p>
                <p className="text-caption text-ink-600 mt-0.5 truncate">
                  {p.is_member
                    ? `Member · ${formatRupiah(p.tagihan)}`
                    : p.bebas_biaya
                    ? `Bebas Biaya · ${formatRupiah(p.tagihan)}`
                    : `Non-Member · ${formatRupiah(p.tagihan)}`}
                  {p.status_main === 'lunas' && (p.dibayar || 0) > p.tagihan && (
                    <span className="text-emerald-700 font-semibold ml-1.5">
                      · Bayar {formatRupiah(p.dibayar)} (+{formatRupiah(p.dibayar - p.tagihan)})
                    </span>
                  )}
                </p>
              </div>
              <div className="shrink-0">{statusBadge(p.status_main)}</div>
            </div>

            {/* Action buttons */}
            {!terkunci && (
              <div className="mt-3.5 pt-3 border-t border-line/60 flex items-center gap-2">
                {p.status_main === 'bermain' && (
                  <Button
                    size="sm"
                    variant="tonal"
                    className={`flex-1 ${
                      p.has_active_draft_session
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                    loading={selesaiLoadingId === p.id}
                    disabled={p.has_active_draft_session}
                    onClick={() => handleSelesaiMain(p)}
                    title={
                      p.has_active_draft_session
                        ? `Pemain masih aktif bermain di Lapangan ${p.active_draft_lapangan}. Masukkan bola pada sesi untuk menyelesaikan.`
                        : 'Selesaikan sesi bermain'
                    }
                  >
                    {p.has_active_draft_session
                      ? `Main (Lap. ${p.active_draft_lapangan})`
                      : 'Selesai Main'}
                  </Button>
                )}

                {p.status_main === 'selesai' && (
                  <Button
                    size="sm"
                    variant="primary"
                    className="flex-1"
                    onClick={() => openRincianSheet(p)}
                  >
                    Bayar Tagihan
                  </Button>
                )}

                {p.status_main === 'lunas' && (
                  <div className="flex gap-2 flex-1">
                    <Button
                      size="sm"
                      variant="tonal"
                      className="flex-1"
                      onClick={() => openRincianSheet(p)}
                    >
                      Rincian
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
                      Buka Kembali
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* Rincian Tagihan & Pembayaran Sheet */}
      <BottomSheet
        open={!!rincianSheet}
        onClose={() => setRincianSheet(null)}
        title="Rincian Tagihan"
      >
        {rincianSheet && (
          <div className="flex flex-col gap-4">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-base text-ink-900">
                  {rincianSheet.peserta.nama}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {rincianSheet.peserta.is_member ? (
                    <Badge label="Member (Bebas Biaya Lapangan)" variant="member" />
                  ) : rincianSheet.peserta.bebas_biaya ? (
                    <Badge label="Bebas Biaya" variant="bebas-biaya" />
                  ) : (
                    <Badge label="Non-Member" variant="non-member" />
                  )}
                </div>
              </div>
              {statusBadge(rincianSheet.peserta.status_main)}
            </div>

            {/* Detail Penggunaan Bola */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="text-caption font-semibold text-ink-400 uppercase tracking-wider">
                  Detail Penggunaan Bola
                </h4>
                <span className="text-caption text-ink-400">
                  {rincianSheet.breakdown.sesi_details?.length ?? 0} Sesi
                </span>
              </div>

              {(!rincianSheet.breakdown.sesi_details ||
                rincianSheet.breakdown.sesi_details.length === 0) ? (
                <div className="bg-peach-100 rounded-lg p-3 text-center text-caption text-ink-400">
                  Belum ada sesi bermain yang dicatat
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {rincianSheet.breakdown.sesi_details.map((s, idx) => (
                    <div
                      key={s.sesi_id || idx}
                      className="bg-peach-100 border border-line rounded-lg p-2.5 text-caption flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-ink-900">
                          Sesi {s.sesi_ke} · Lapangan {s.lapangan}
                        </span>
                        <span className="font-semibold text-primary-700">
                          {s.is_draft ? (
                            <span className="text-icon-orange font-normal">
                              Sesi Aktif
                            </span>
                          ) : (
                            formatRupiah(s.biaya_bola_pemain)
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-ink-400">
                        <span>
                          {s.is_draft ? (
                            'Bola belum diinput'
                          ) : s.is_bearer ? (
                            <>
                              <span className="font-medium text-ink-700">
                                {s.bola_terpakai_pemain ?? s.bola_terpakai} bola
                              </span>{' '}
                              (total {s.total_pemain} pemain)
                            </>
                          ) : s.bearer_nama ? (
                            <span className="text-ink-400">0 bola</span>
                          ) : (
                            <>
                              <span className="font-medium text-ink-700">
                                {s.bola_terpakai} bola
                              </span>{' '}
                              dipakai
                            </>
                          )}
                        </span>
                        <span className="italic">
                          {s.is_bearer
                            ? 'Ditanggung sendiri'
                            : s.bearer_nama
                            ? `Ditanggung ${s.bearer_nama}`
                            : rincianSheet.peserta.bebas_biaya
                            ? 'Bebas biaya'
                            : `${s.bola_terpakai} bola`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ringkasan Biaya */}
            <div className="bg-peach-100 rounded-xl p-3 border border-line flex flex-col gap-1.5 text-body">
              <div className="flex justify-between text-ink-600">
                <span>Biaya Bola</span>
                <span className="font-medium text-ink-900">
                  {formatRupiah(rincianSheet.breakdown.biaya_bola)}
                </span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Biaya Lapangan (1x pertemuan)</span>
                <span className="font-medium text-ink-900">
                  {rincianSheet.peserta.is_member ? (
                    <span className="text-icon-mint font-semibold">
                      Rp 0 (Member)
                    </span>
                  ) : rincianSheet.peserta.bebas_biaya ? (
                    <span className="text-icon-mint font-semibold">
                      Rp 0 (Bebas Biaya)
                    </span>
                  ) : (
                    formatRupiah(rincianSheet.breakdown.biaya_lapangan)
                  )}
                </span>
              </div>
              {rincianSheet.breakdown.pembulatan !== 0 && (
                <div className="flex justify-between text-ink-600">
                  <span>Pembulatan</span>
                  <span className="font-medium text-ink-900">
                    {formatRupiah(rincianSheet.breakdown.pembulatan)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-line pt-2 mt-1">
                <span className="font-bold text-ink-900">Total Tagihan</span>
                <span className="font-extrabold text-base text-primary-700 nums">
                  {formatRupiah(rincianSheet.breakdown.tagihan_total)}
                </span>
              </div>
              {rincianSheet.peserta.status_main === 'lunas' &&
                (rincianSheet.peserta.dibayar || 0) > rincianSheet.breakdown.tagihan_total && (
                  <>
                    <div className="flex justify-between text-emerald-700 font-semibold text-caption pt-1.5 border-t border-dashed border-line">
                      <span>Kelebihan Bayar (Masuk Kas)</span>
                      <span className="nums font-bold">
                        +{formatRupiah(
                          (rincianSheet.peserta.dibayar || 0) -
                            rincianSheet.breakdown.tagihan_total
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 font-bold text-ink-900 text-body">
                      <span>Total Masuk Kas</span>
                      <span className="nums text-emerald-800 font-extrabold">
                        {formatRupiah(rincianSheet.peserta.dibayar)}
                      </span>
                    </div>
                  </>
                )}
            </div>

            {/* Opsi Bayar Iuran jika Non-Member */}
            {!rincianSheet.peserta.is_member &&
              !rincianSheet.peserta.bebas_biaya &&
              rincianSheet.peserta.status_main !== 'lunas' &&
              !terkunci && (
                <div className="bg-tint-mint border border-line rounded-xl p-3 flex items-center justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-bold text-icon-mint">
                      Pemain Non-Member
                    </p>
                    <p className="text-caption text-ink-600 leading-tight mt-0.5">
                      Bayar iuran bulanan agar bebas biaya sewa lapangan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openIuranSheetForPeserta(rincianSheet.peserta)}
                    className="px-3 py-1.5 text-caption font-semibold rounded-lg bg-primary-700 text-white hover:bg-primary-900 shrink-0 transition-colors"
                  >
                    + Bayar Iuran
                  </button>
                </div>
              )}

            {/* Pembayaran Section */}
            {rincianSheet.peserta.status_main === 'lunas' ? (
              <div className="bg-tint-mint border border-line rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between text-icon-mint font-semibold text-body">
                  <span>Sudah Lunas</span>
                  <span className="nums">{formatRupiah(rincianSheet.peserta.dibayar)}</span>
                </div>
                <p className="text-caption text-ink-600">
                  Metode:{' '}
                  <span className="font-medium">
                    {rincianSheet.peserta.metode_bayar || 'Cash'}
                  </span>
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setRincianSheet(null)}
                >
                  Tutup
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 pt-1">
                {rincianSheet.peserta.has_active_draft_session && (
                  <div className="bg-warning-tonal border border-warning/20 rounded-lg p-2.5 text-caption text-warning flex items-center gap-1.5">
                    <span>
                      Pemain masih bermain di Lapangan{' '}
                      {rincianSheet.peserta.active_draft_lapangan}. Selesaikan sesi
                      terlebih dahulu sebelum bayar.
                    </span>
                  </div>
                )}

                {/* Metode Bayar Selector */}
                <div>
                  <label className="text-caption font-semibold text-ink-700 block mb-1.5">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodeTipe('cash')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-body font-medium transition-all ${
                        metodeTipe === 'cash'
                          ? 'border-primary-700 bg-primary-100 text-primary-700'
                          : 'border-line bg-surface text-ink-700 hover:bg-peach-100'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodeTipe('transfer')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-body font-medium transition-all ${
                        metodeTipe === 'transfer'
                          ? 'border-primary-700 bg-primary-100 text-primary-700'
                          : 'border-line bg-surface text-ink-700 hover:bg-peach-100'
                      }`}
                    >
                      Transfer
                    </button>
                  </div>
                </div>

                {/* Dropdown Transfer / E-Wallet */}
                {metodeTipe === 'transfer' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-caption font-semibold text-ink-700">
                      Jenis Bank / E-Wallet
                    </label>
                    <select
                      value={jenisTransfer}
                      onChange={(e) => setJenisTransfer(e.target.value)}
                      className="w-full text-body rounded-lg border border-line py-2.5 px-3 bg-surface text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-transparent"
                    >
                      <optgroup label="Bank Transfer">
                        <option value="BCA">Bank BCA</option>
                        <option value="Mandiri">Bank Mandiri</option>
                        <option value="BRI">Bank BRI</option>
                        <option value="BNI">Bank BNI</option>
                        <option value="BSI">Bank BSI</option>
                      </optgroup>
                      <optgroup label="E-Wallet &amp; QRIS">
                        <option value="GoPay">GoPay</option>
                        <option value="OVO">OVO</option>
                        <option value="DANA">DANA</option>
                        <option value="ShopeePay">ShopeePay</option>
                        <option value="QRIS">QRIS</option>
                      </optgroup>
                      <optgroup label="Lainnya">
                        <option value="Lainnya">Bank / Saluran Lainnya...</option>
                      </optgroup>
                    </select>

                    {jenisTransfer === 'Lainnya' && (
                      <Input
                        placeholder="Tulis nama bank/e-wallet..."
                        value={customTransfer}
                        onChange={(e) => setCustomTransfer(e.target.value)}
                      />
                    )}
                  </div>
                )}

                {/* Input Jumlah Bayar */}
                <CurrencyInput
                  label="Jumlah Bayar"
                  value={parseInt(jumlahBayar, 10) || 0}
                  onChange={(val) => setJumlahBayar(String(val))}
                  placeholder="0"
                  quickAdds={[5000, 10000, 20000, 50000]}
                />

                {bayarError && (
                  <p className="text-caption text-danger font-medium" role="alert">
                    {bayarError}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="secondary"
                    onClick={() => setRincianSheet(null)}
                    className="flex-1"
                  >
                    Tutup
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleBayarFromSheet}
                    loading={bayarLoading}
                    disabled={
                      rincianSheet.peserta.has_active_draft_session || terkunci
                    }
                    className="flex-1"
                  >
                    Bayar ({computedMetode})
                  </Button>
                </div>

                {rincianSheet.peserta.status_main === 'selesai' && !terkunci && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const p = rincianSheet.peserta;
                      setRincianSheet(null);
                      setBukaSheet(p);
                      setAlasanBuka('');
                      setBukaError(null);
                    }}
                    className="w-full !text-ink-600 hover:!text-danger border border-line rounded-xl !h-9 text-caption font-semibold mt-1"
                  >
                    Buka Kembali Status Bermain
                  </Button>
                )}
              </div>
            )}
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
            <p className="text-body text-ink-600">
              Pembayaran <span className="font-semibold">{bukaSheet.nama}</span> akan
              direset ke status Bermain.
            </p>
            <Input
              label="Alasan"
              value={alasanBuka}
              onChange={(e) => setAlasanBuka(e.target.value)}
              placeholder="Wajib diisi"
            />
            {bukaError && (
              <p className="text-body text-danger" role="alert">
                {bukaError}
              </p>
            )}
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setBukaSheet(null)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={handleBukaKembali}
                loading={bukaLoading}
                className="flex-1"
              >
                Buka Kembali
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Quick Iuran Sheet */}
      <BottomSheet
        open={iuranSheetOpen}
        onClose={() => setIuranSheetOpen(false)}
        title={`Catat Iuran — ${iuranPeserta?.nama ?? ''}`}
      >
        <div className="flex flex-col gap-4">
          <div className="bg-tint-mint border border-line rounded-xl p-3">
            <p className="text-caption text-ink-600 leading-relaxed">
              Setelah iuran dicatat, status <strong>{iuranPeserta?.nama}</strong> otomatis menjadi <strong>Member</strong> untuk periode bulan ini dan biaya sewa lapangan pada pertemuan ini otomatis menjadi <strong>Rp 0</strong>.
            </p>
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
                className="h-11 rounded-lg border border-line px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-body font-medium text-ink-700">Bulan</label>
              <select
                value={iuranBulan}
                onChange={(e) => setIuranBulan(parseInt(e.target.value, 10))}
                className="h-11 rounded-lg border border-line px-3 text-body text-ink-900 focus:outline-none focus:ring-2 focus:ring-primary-700"
              >
                {BULAN.map((nama, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <CurrencyInput
            label="Nominal Iuran"
            value={parseInt(iuranNominal, 10) || 0}
            onChange={(val) => setIuranNominal(String(val))}
            placeholder="0"
            quickAdds={[25000, 50000, 75000, 100000]}
          />

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
              onClick={handleSimpanIuranFromTagihan}
              loading={iuranLoading}
              className="flex-1"
            >
              Simpan Iuran
            </Button>
          </div>
        </div>
      </BottomSheet>

      {/* Bulk Bayar Confirm Dialog */}
      <ConfirmDialog
        open={bulkBayarOpen}
        onClose={() => !bulkBayarLoading && setBulkBayarOpen(false)}
        onConfirm={handleBulkBayarCash}
        title="Tandai Semua Lunas (Cash)"
        description={`Tandai pembayaran tunai (Cash) untuk ${eligibleBulkPeserta.length} pemain yang belum bayar? Total yang akan dilunaskan: ${formatRupiah(totalEligibleTagihan)}.${skippedDraftCount > 0 ? ` (${skippedDraftCount} pemain dilewati karena masih bermain di lapangan)` : ''}`}
        confirmLabel="Ya, Lunaskan Semua"
        cancelLabel="Batal"
        loading={bulkBayarLoading}
      />
    </div>
  );
}
