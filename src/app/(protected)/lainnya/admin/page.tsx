'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Input } from '@/components/ui/Input';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

interface AdminData {
  id: string;
  nama: string;
  email: string;
  aktif: boolean;
  dibuat_pada: string;
}

const addAdminSchema = z.object({
  nama: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
});

type AddAdminForm = z.infer<typeof addAdminSchema>;

export default function AdminPage() {
  const { toasts, addToast, dismiss } = useToast();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<AddAdminForm>({ nama: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof AddAdminForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin?per_page=100');
      const json = await res.json();
      if (res.ok) setAdmins(json.data as AdminData[]);
      else addToast(json.message ?? 'Gagal memuat data', 'error');
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleChange = (key: keyof AddAdminForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleOpenAdd = () => {
    setForm({ nama: '', email: '', password: '' });
    setErrors({});
    setServerError(null);
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const parsed = addAdminSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof AddAdminForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof AddAdminForm;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Admin berhasil ditambahkan', 'success');
        setSheetOpen(false);
        fetchAdmins();
      } else {
        setServerError(json.message ?? 'Terjadi kesalahan');
      }
    } catch {
      setServerError('Terjadi kesalahan jaringan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, nama: string) => {
    if (!confirm(`Nonaktifkan admin "${nama}"?`)) return;
    try {
      const res = await fetch(`/api/v1/admin/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        addToast('Admin berhasil dinonaktifkan', 'success');
        fetchAdmins();
      } else {
        addToast(json.message ?? 'Gagal menonaktifkan admin', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-neutral-900">Admin</h1>
        <Button size="sm" onClick={handleOpenAdd}>+ Tambah</Button>
      </div>

      {loading && <p className="text-neutral-500 text-sm text-center">Memuat...</p>}

      <div className="flex flex-col gap-3">
        {admins.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-neutral-900 truncate">{a.nama}</p>
                <p className="text-sm text-neutral-500 truncate">{a.email}</p>
              </div>
              <Badge label={a.aktif ? 'Aktif' : 'Nonaktif'} variant={a.aktif ? 'success' : 'default'} />
            </div>
            {a.aktif && (
              <Button
                variant="danger"
                size="sm"
                className="mt-3 w-full"
                onClick={() => handleDeactivate(a.id, a.nama)}
              >
                Nonaktifkan
              </Button>
            )}
          </div>
        ))}
      </div>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Tambah Admin">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Nama" value={form.nama} onChange={handleChange('nama')} error={errors.nama} placeholder="Nama admin" />
          <Input label="Email" type="email" value={form.email} onChange={handleChange('email')} error={errors.email} placeholder="email@contoh.com" />
          <Input label="Password" type="password" value={form.password} onChange={handleChange('password')} error={errors.password} placeholder="Minimal 8 karakter" />
          {serverError && <p className="text-sm text-danger-600" role="alert">{serverError}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setSheetOpen(false)} className="flex-1">Batal</Button>
            <Button type="submit" loading={submitting} className="flex-1">Tambah</Button>
          </div>
        </form>
      </BottomSheet>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
