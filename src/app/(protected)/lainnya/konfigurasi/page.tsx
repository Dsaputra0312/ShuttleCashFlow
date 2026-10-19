'use client';

import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

interface KonfigurasiData {
  harga_bola_per_biji: number;
  isi_per_tabung: number;
  biaya_lapangan_non_member: number;
  iuran_bulanan: number;
  kelipatan_pembulatan: number;
  biaya_sewa_default: number;
}

const DEFAULT: KonfigurasiData = {
  harga_bola_per_biji: 5000,
  isi_per_tabung: 12,
  biaya_lapangan_non_member: 10000,
  iuran_bulanan: 50000,
  kelipatan_pembulatan: 1000,
  biaya_sewa_default: 100000,
};

export default function KonfigurasiPage() {
  const { toasts, addToast, dismiss } = useToast();
  const [form, setForm] = useState<KonfigurasiData>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof KonfigurasiData, string>>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/v1/konfigurasi');
        if (res.ok) {
          const json = await res.json();
          const d = json.data as KonfigurasiData;
          setForm({
            harga_bola_per_biji: d.harga_bola_per_biji,
            isi_per_tabung: d.isi_per_tabung,
            biaya_lapangan_non_member: d.biaya_lapangan_non_member,
            iuran_bulanan: d.iuran_bulanan,
            kelipatan_pembulatan: d.kelipatan_pembulatan,
            biaya_sewa_default: d.biaya_sewa_default,
          });
        }
      } catch {
        // ignore — use defaults
      } finally {
        setFetching(false);
      }
    };
    load();
  }, []);

  const handleChange = (key: keyof KonfigurasiData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setForm((prev) => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof KonfigurasiData, string>> = {};
    (Object.keys(form) as (keyof KonfigurasiData)[]).forEach((key) => {
      if (form[key] < 0) errs[key] = 'Nilai harus lebih dari atau sama dengan 0';
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/konfigurasi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Konfigurasi berhasil disimpan', 'success');
      } else {
        addToast(json.message ?? 'Terjadi kesalahan', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fields: { key: keyof KonfigurasiData; label: string; hint?: string }[] = [
    { key: 'harga_bola_per_biji', label: 'Harga Bola per Biji (Rp)' },
    { key: 'isi_per_tabung', label: 'Isi per Tabung (biji)' },
    { key: 'biaya_lapangan_non_member', label: 'Biaya Lapangan Non-Member (Rp)' },
    { key: 'iuran_bulanan', label: 'Iuran Bulanan (Rp)' },
    { key: 'kelipatan_pembulatan', label: 'Kelipatan Pembulatan (Rp)' },
    { key: 'biaya_sewa_default', label: 'Biaya Sewa Default (Rp)' },
  ];

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Konfigurasi</h1>

      <div className="bg-primary-50 border border-primary-200 rounded-xl p-3.5 mb-4 text-xs text-primary-900">
        <p className="font-semibold mb-0.5">🏸 Pengelolaan Stok Bola</p>
        <p className="text-primary-700 leading-relaxed">
          Pencatatan sisa fisik bola awal, pembelian tabung, dan koreksi stok kini dikelola langsung di menu{' '}
          <span className="font-semibold underline">Lainnya &gt; Stok Bola</span>.
        </p>
      </div>

      {fetching ? (
        <p className="text-neutral-500">Memuat...</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map(({ key, label, hint }) => (
            <Input
              key={key}
              label={label}
              hint={hint}
              type="number"
              min={0}
              value={form[key]}
              onChange={handleChange(key)}
              error={errors[key]}
            />
          ))}

          <Button type="submit" loading={loading} className="w-full mt-2">
            Simpan Konfigurasi
          </Button>
        </form>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
