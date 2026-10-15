'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

interface KategoriKas {
  id: string;
  nama: string;
  tipe: 'pemasukan' | 'pengeluaran';
  adalah_sistem: boolean;
  aktif: boolean;
}

const kategoriSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  tipe: z.enum(['pemasukan', 'pengeluaran'], {
    error: 'Pilih tipe',
  }),
});

type KategoriForm = z.infer<typeof kategoriSchema>;

export default function KategoriKasPage() {
  const { toasts, addToast, dismiss } = useToast();
  const [list, setList] = useState<KategoriKas[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<KategoriKas | null>(null);
  const [form, setForm] = useState<KategoriForm>({ nama: '', tipe: 'pemasukan' });
  const [errors, setErrors] = useState<Partial<Record<keyof KategoriForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/kategori-kas?per_page=100');
      const json = await res.json();
      if (res.ok) setList(json.data as KategoriKas[]);
      else addToast(json.message ?? 'Gagal memuat data', 'error');
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openAdd = () => {
    setEditing(null);
    setForm({ nama: '', tipe: 'pemasukan' });
    setErrors({});
    setServerError(null);
    setSheetOpen(true);
  };

  const openEdit = (k: KategoriKas) => {
    setEditing(k);
    setForm({ nama: k.nama, tipe: k.tipe });
    setErrors({});
    setServerError(null);
    setSheetOpen(true);
  };

  const handleChange = (key: keyof KategoriForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = kategoriSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof KategoriForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof KategoriForm;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const url = editing ? `/api/v1/kategori-kas/${editing.id}` : '/api/v1/kategori-kas';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (res.ok) {
        addToast(editing ? 'Kategori berhasil diperbarui' : 'Kategori berhasil ditambahkan', 'success');
        setSheetOpen(false);
        fetchList();
      } else {
        setServerError(json.message ?? 'Terjadi kesalahan');
      }
    } catch {
      setServerError('Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (k: KategoriKas) => {
    if (!confirm(`Hapus kategori "${k.nama}"?`)) return;
    try {
      const res = await fetch(`/api/v1/kategori-kas/${k.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        addToast('Kategori berhasil dihapus', 'success');
        fetchList();
      } else {
        addToast(json.message ?? 'Gagal menghapus kategori', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-neutral-900">Kategori Kas</h1>
        <Button size="sm" onClick={openAdd}>+ Tambah</Button>
      </div>

      {loading && <p className="text-neutral-500 text-sm text-center">Memuat...</p>}

      <div className="flex flex-col gap-3">
        {list.map((k) => (
          <div
            key={k.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-neutral-900 truncate">{k.nama}</p>
                  {k.adalah_sistem && (
                    <span aria-label="Kategori sistem" title="Kategori sistem" className="text-neutral-400">🔒</span>
                  )}
                </div>
              </div>
              <Badge
                label={k.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                variant={k.tipe === 'pemasukan' ? 'success' : 'danger'}
              />
            </div>

            {!k.adalah_sistem && (
              <div className="flex gap-2 mt-3">
                <Button variant="secondary" size="sm" onClick={() => openEdit(k)} className="flex-1">
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(k)} className="flex-1">
                  Hapus
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Nama Kategori"
            value={form.nama}
            onChange={handleChange('nama')}
            error={errors.nama}
            placeholder="Contoh: Sponsor"
          />

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-neutral-700">Tipe</label>
            <select
              value={form.tipe}
              onChange={handleChange('tipe')}
              className="h-11 w-full rounded-lg border border-neutral-300 px-3 text-base text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </select>
            {errors.tipe && <p className="text-sm text-danger-600">{errors.tipe}</p>}
          </div>

          {serverError && <p className="text-sm text-danger-600" role="alert">{serverError}</p>}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)} className="flex-1">Batal</Button>
            <Button type="submit" loading={submitting} className="flex-1">{editing ? 'Simpan' : 'Tambah'}</Button>
          </div>
        </form>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
