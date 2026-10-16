'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
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

  const statusBadge = (status: Peserta['status_main']) => {
    if (status === 'bermain') return <Badge label="Bermain" variant="default" />;
    if (status === 'selesai') return <Badge label="Selesai" variant="warning" />;
    return <Badge label="Lunas" variant="success" />;
  };

  if (loading && pesertaList.length === 0) {
    return (
      <div className="p-4">
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="p-4">
      {pesertaList.length === 0 && (
        <EmptyState
          message="Belum ada peserta"
          hint="Peserta akan muncul setelah ditambahkan ke sesi"
        />
      )}

      <div className="flex flex-col gap-3">
        {pesertaList.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 transition-all"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-neutral-900 text-sm truncate">
                    {p.nama}
                  </p>
                  {p.is_member && (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                      Member
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-600 mt-0.5">
                  Tagihan:{' '}
                  <span className="font-semibold text-neutral-900">
                    {formatRupiah(p.tagihan)}
                  </span>
                  {p.dibayar > 0 && ` • Dibayar: ${formatRupiah(p.dibayar)} (${p.metode_bayar || 'Cash'})`}
                </p>
                {p.has_active_draft_session && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
                    <span>🏸 Sedang main di Lap. {p.active_draft_lapangan}</span>
                  </p>
                )}
              </div>
              {statusBadge(p.status_main)}
            </div>

            {/* Bermain → Selesai Main */}
            {p.status_main === 'bermain' && !terkunci && (
              <Button
                size="sm"
                variant="secondary"
                className={`w-full mt-2 ${
                  p.has_active_draft_session
                    ? 'opacity-50 cursor-not-allowed bg-neutral-100 text-neutral-400 border-neutral-200'
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

            {/* Selesai → Selesai Main */}
            {p.status_main === 'selesai' && !terkunci && (
              <Button
                size="sm"
                variant="secondary"
                className="w-full mt-2"
                onClick={() => openRincianSheet(p)}
              >
                Selesai Main
              </Button>
            )}

            {/* Lunas → Rincian / Buka Kembali */}
            {p.status_main === 'lunas' && !terkunci && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="secondary"
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
        ))}
      </div>

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
                <p className="font-bold text-base text-neutral-900">
                  {rincianSheet.peserta.nama}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {rincianSheet.peserta.is_member ? (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                      Member (Bebas Lapangan & Bola)
                    </span>
                  ) : rincianSheet.peserta.bebas_biaya ? (
                    <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                      Bebas Biaya
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-neutral-100 text-neutral-700 px-1.5 py-0.5 rounded-full">
                      Non-Member
                    </span>
                  )}
                </div>
              </div>
              {statusBadge(rincianSheet.peserta.status_main)}
            </div>

            {/* Detail Penggunaan Bola */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Detail Penggunaan Bola
                </h4>
                <span className="text-xs text-neutral-400">
                  {rincianSheet.breakdown.sesi_details?.length ?? 0} Sesi
                </span>
              </div>

              {(!rincianSheet.breakdown.sesi_details ||
                rincianSheet.breakdown.sesi_details.length === 0) ? (
                <div className="bg-neutral-50 rounded-lg p-3 text-center text-xs text-neutral-500">
                  Belum ada sesi bermain yang dicatat
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {rincianSheet.breakdown.sesi_details.map((s, idx) => (
                    <div
                      key={s.sesi_id || idx}
                      className="bg-neutral-50 border border-neutral-200/80 rounded-lg p-2.5 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-800">
                          Sesi {s.sesi_ke} • Lapangan {s.lapangan}
                        </span>
                        <span className="font-semibold text-primary-700">
                          {s.is_draft ? (
                            <span className="text-amber-600 font-normal">
                              Sesi Aktif
                            </span>
                          ) : (
                            formatRupiah(s.biaya_bola_pemain)
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                        <span>
                          {s.is_draft ? (
                            'Bola belum diinput'
                          ) : s.is_bearer ? (
                            <>
                              <span className="font-medium text-neutral-700">
                                {s.bola_terpakai_pemain ?? s.bola_terpakai} bola
                              </span>{' '}
                              (total {s.total_pemain} pemain)
                            </>
                          ) : s.bearer_nama ? (
                            <span className="text-neutral-400">0 bola</span>
                          ) : (
                            <>
                              <span className="font-medium text-neutral-700">
                                {s.bola_terpakai} bola
                              </span>{' '}
                              dipakai
                            </>
                          )}
                        </span>
                        <span className="italic">
                          {s.is_bearer
                            ? '⭐ Ditanggung sendiri'
                            : s.bearer_nama
                            ? `Ditanggung ${s.bearer_nama}`
                            : rincianSheet.peserta.is_member
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
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-neutral-600">
                <span>Biaya Bola</span>
                <span className="font-medium text-neutral-900">
                  {formatRupiah(rincianSheet.breakdown.biaya_bola)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Biaya Lapangan (1x pertemuan)</span>
                <span className="font-medium text-neutral-900">
                  {rincianSheet.peserta.is_member ? (
                    <span className="text-emerald-600 font-semibold">
                      Rp 0 (Member)
                    </span>
                  ) : rincianSheet.peserta.bebas_biaya ? (
                    <span className="text-emerald-600 font-semibold">
                      Rp 0 (Bebas Biaya)
                    </span>
                  ) : (
                    formatRupiah(rincianSheet.breakdown.biaya_lapangan)
                  )}
                </span>
              </div>
              {rincianSheet.breakdown.pembulatan !== 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Pembulatan</span>
                  <span className="font-medium text-neutral-900">
                    {formatRupiah(rincianSheet.breakdown.pembulatan)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t border-neutral-200 pt-2 mt-1">
                <span className="font-bold text-neutral-900">Total Tagihan</span>
                <span className="font-extrabold text-base text-primary-600">
                  {formatRupiah(rincianSheet.breakdown.tagihan_total)}
                </span>
              </div>
            </div>

            {/* Opsi Bayar Iuran jika Non-Member */}
            {!rincianSheet.peserta.is_member &&
              !rincianSheet.peserta.bebas_biaya &&
              rincianSheet.peserta.status_main !== 'lunas' &&
              !terkunci && (
                <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-emerald-900">
                      Pemain Non-Member
                    </p>
                    <p className="text-[11px] text-emerald-700 leading-tight mt-0.5">
                      Bayar iuran bulanan agar bebas biaya sewa lapangan.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openIuranSheetForPeserta(rincianSheet.peserta)}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-xs shrink-0 transition-colors"
                  >
                    + Bayar Iuran
                  </button>
                </div>
              )}

            {/* Pembayaran Section */}
            {rincianSheet.peserta.status_main === 'lunas' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center justify-between text-emerald-800 font-semibold text-sm">
                  <span>✓ Sudah Lunas</span>
                  <span>{formatRupiah(rincianSheet.peserta.dibayar)}</span>
                </div>
                <p className="text-xs text-emerald-700">
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
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>
                      Pemain masih bermain di Lapangan{' '}
                      {rincianSheet.peserta.active_draft_lapangan}. Selesaikan sesi
                      terlebih dahulu sebelum bayar.
                    </span>
                  </div>
                )}

                {/* Metode Bayar Selector */}
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block mb-1.5">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMetodeTipe('cash')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        metodeTipe === 'cash'
                          ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span>💵</span>
                      <span>Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetodeTipe('transfer')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                        metodeTipe === 'transfer'
                          ? 'border-primary-600 bg-primary-50 text-primary-700 shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span>💳</span>
                      <span>Transfer</span>
                    </button>
                  </div>
                </div>

                {/* Dropdown Transfer / E-Wallet */}
                {metodeTipe === 'transfer' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-700">
                      Jenis Bank / E-Wallet
                    </label>
                    <select
                      value={jenisTransfer}
                      onChange={(e) => setJenisTransfer(e.target.value)}
                      className="w-full text-sm rounded-lg border border-neutral-300 py-2.5 px-3 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <optgroup label="Bank Transfer">
                        <option value="BCA">Bank BCA</option>
                        <option value="Mandiri">Bank Mandiri</option>
                        <option value="BRI">Bank BRI</option>
                        <option value="BNI">Bank BNI</option>
                        <option value="BSI">Bank BSI</option>
                      </optgroup>
                      <optgroup label="E-Wallet & QRIS">
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
                        className="text-xs mt-1"
                      />
                    )}
                  </div>
                )}

                {/* Input Jumlah Bayar */}
                <Input
                  label="Jumlah Bayar"
                  type="number"
                  value={jumlahBayar}
                  onChange={(e) => setJumlahBayar(e.target.value)}
                  min={0}
                />

                {bayarError && (
                  <p className="text-xs text-danger-600 font-medium" role="alert">
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
                  <button
                    type="button"
                    onClick={() => {
                      const p = rincianSheet.peserta;
                      setRincianSheet(null);
                      setBukaSheet(p);
                      setAlasanBuka('');
                      setBukaError(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-danger-600 transition-colors text-center pt-1"
                  >
                    Buka kembali status bermain
                  </button>
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
            <p className="text-sm text-neutral-600">
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
              <p className="text-sm text-danger-600" role="alert">
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
          <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-3">
            <p className="text-xs text-emerald-800 leading-relaxed">
              Setelah iuran dicatat, status <strong>{iuranPeserta?.nama}</strong> otomatis menjadi <strong>Member</strong> untuk periode bulan ini dan biaya sewa lapangan pada pertemuan ini otomatis menjadi <strong>Rp 0</strong>.
            </p>
          </div>

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
            label="Nominal (Rp)"
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
    </div>
  );
}
