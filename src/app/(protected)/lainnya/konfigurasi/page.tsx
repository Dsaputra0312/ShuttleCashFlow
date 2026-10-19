'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { TintCard } from '@/components/ui/TintCard';
import { Input } from '@/components/ui/Input';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Button } from '@/components/ui/Button';
import { AppIcon } from '@/components/ui/AppIcon';
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
  const router = useRouter();
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

  const handleCurrencyChange = (key: keyof KonfigurasiData) => (val: number) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleNumberChange = (key: keyof KonfigurasiData) => (e: React.ChangeEvent<HTMLInputElement>) => {
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

  return (
    <div>
      <PageHeader
        title="Konfigurasi"
        onBack={() => router.push('/lainnya')}
      />

      <div className="p-4 max-w-xl mx-auto">
        <TintCard variant="lavender" className="p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 text-icon-lavender">
              <AppIcon icon={Info} size="sm" />
            </div>
            <div className="text-caption text-ink-900">
              <p className="font-semibold mb-1">Pengelolaan Stok Bola</p>
              <p className="text-ink-600 leading-relaxed">
                Pencatatan sisa fisik bola awal, pembelian tabung, dan koreksi stok kini dikelola langsung di menu{' '}
                <span className="font-semibold underline">Lainnya &gt; Stok Bola</span>.
              </p>
            </div>
          </div>
        </TintCard>

        {fetching ? (
          <p className="text-caption text-ink-400 text-center py-4">Memuat...</p>
        ) : (
          <Card padding>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <CurrencyInput
                label="Harga Bola per Biji"
                value={form.harga_bola_per_biji}
                onChange={handleCurrencyChange('harga_bola_per_biji')}
                error={errors.harga_bola_per_biji}
              />

              <Input
                label="Isi per Tabung (biji)"
                type="number"
                min={0}
                value={form.isi_per_tabung}
                onChange={handleNumberChange('isi_per_tabung')}
                error={errors.isi_per_tabung}
              />

              <CurrencyInput
                label="Biaya Lapangan Non-Member"
                value={form.biaya_lapangan_non_member}
                onChange={handleCurrencyChange('biaya_lapangan_non_member')}
                error={errors.biaya_lapangan_non_member}
              />

              <CurrencyInput
                label="Iuran Bulanan"
                value={form.iuran_bulanan}
                onChange={handleCurrencyChange('iuran_bulanan')}
                error={errors.iuran_bulanan}
              />

              <CurrencyInput
                label="Kelipatan Pembulatan"
                value={form.kelipatan_pembulatan}
                onChange={handleCurrencyChange('kelipatan_pembulatan')}
                error={errors.kelipatan_pembulatan}
              />

              <CurrencyInput
                label="Biaya Sewa Default"
                value={form.biaya_sewa_default}
                onChange={handleCurrencyChange('biaya_sewa_default')}
                error={errors.biaya_sewa_default}
              />

              <Button type="submit" loading={loading} className="w-full mt-2">
                Simpan Konfigurasi
              </Button>
            </form>
          </Card>
        )}

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  );
}
