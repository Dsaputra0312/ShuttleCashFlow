'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';

const pemainSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  no_hp: z.string().optional(),
  catatan: z.string().optional(),
  bebas_biaya: z.boolean().optional(),
});

type PemainFormData = z.infer<typeof pemainSchema>;

export interface PemainFormValues {
  id?: string;
  nama: string;
  no_hp?: string | null;
  catatan?: string | null;
  bebas_biaya?: boolean;
}

interface PemainFormProps {
  open: boolean;
  onClose: () => void;
  initial?: PemainFormValues | null;
  onSuccess: () => void;
}

export function PemainForm({ open, onClose, initial, onSuccess }: PemainFormProps) {
  const [form, setForm] = useState<PemainFormData>({
    nama: '',
    no_hp: '',
    catatan: '',
    bebas_biaya: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PemainFormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const isEdit = !!initial?.id;

  const [prevOpen, setPrevOpen] = useState(open);
  const [prevInitial, setPrevInitial] = useState(initial);
  if (open !== prevOpen || initial !== prevInitial) {
    setPrevOpen(open);
    setPrevInitial(initial);
    if (open) {
      setForm({
        nama: initial?.nama ?? '',
        no_hp: initial?.no_hp ?? '',
        catatan: initial?.catatan ?? '',
        bebas_biaya: initial?.bebas_biaya ?? false,
      });
      setErrors({});
      setServerError(null);
    }
  }

  const handleChange = (key: keyof PemainFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleToggle = () => {
    setForm((prev) => ({ ...prev, bebas_biaya: !prev.bebas_biaya }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = pemainSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof PemainFormData, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof PemainFormData;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const url = isEdit ? `/api/v1/pemain/${initial!.id}` : '/api/v1/pemain';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const json = await res.json();
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setServerError(json.message ?? 'Terjadi kesalahan');
      }
    } catch {
      setServerError('Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Pemain' : 'Tambah Pemain'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nama"
          value={form.nama}
          onChange={handleChange('nama')}
          error={errors.nama}
          placeholder="Nama pemain"
          autoComplete="off"
        />
        <Input
          label="No. HP"
          value={form.no_hp ?? ''}
          onChange={handleChange('no_hp')}
          error={errors.no_hp}
          placeholder="Opsional"
          type="tel"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-neutral-700">Catatan</label>
          <textarea
            value={form.catatan ?? ''}
            onChange={handleChange('catatan')}
            placeholder="Opsional"
            rows={3}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Bebas biaya toggle */}
        <div
          onClick={handleToggle}
          className="flex items-center justify-between w-full h-11 px-3 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100/60 transition-colors cursor-pointer select-none"
        >
          <span className="text-sm text-neutral-700">Bebas Biaya</span>
          <Toggle
            checked={!!form.bebas_biaya}
            onChange={(checked) => setForm((prev) => ({ ...prev, bebas_biaya: checked }))}
            aria-label="Bebas Biaya"
          />
        </div>

        {serverError && (
          <p className="text-sm text-danger-600" role="alert">
            {serverError}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
}
