'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
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
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();
  const [admins, setAdmins] = useState<AdminData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<AddAdminForm>({ nama: '', email: '', password: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof AddAdminForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [deactivatingAdmin, setDeactivatingAdmin] = useState<{ id: string; nama: string } | null>(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

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

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchAdmins();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchAdmins]);

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

  const handleDeactivate = async () => {
    if (!deactivatingAdmin) return;
    setDeactivateLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/${deactivatingAdmin.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        addToast('Admin berhasil dinonaktifkan', 'success');
        setDeactivatingAdmin(null);
        fetchAdmins();
      } else {
        addToast(json.message ?? 'Gagal menonaktifkan admin', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setDeactivateLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Admin"
        onBack={() => router.push('/lainnya')}
        action={
          <Button size="sm" onClick={handleOpenAdd}>
            Tambah
          </Button>
        }
      />

      <div className="p-4 max-w-xl mx-auto">
        {loading && <SkeletonList count={3} />}

        {!loading && admins.length === 0 && (
          <EmptyState
            message="Belum ada admin"
            hint="Tekan tombol Tambah untuk mengundang admin baru"
          />
        )}

        {!loading && admins.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {admins.map((a) => (
              <ListRow
                key={a.id}
                left={<Avatar name={a.nama} size="md" />}
                title={a.nama}
                subtitle={a.email}
                right={
                  <div className="flex items-center gap-2">
                    <Badge
                      label={a.aktif ? 'Aktif' : 'Nonaktif'}
                      variant={a.aktif ? 'aktif' : 'non-aktif'}
                    />
                    {a.aktif && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeactivatingAdmin({ id: a.id, nama: a.nama })}
                      >
                        Nonaktifkan
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </div>
        )}

        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Tambah Admin">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nama"
              value={form.nama}
              onChange={handleChange('nama')}
              error={errors.nama}
              placeholder="Nama admin"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              error={errors.email}
              placeholder="email@contoh.com"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              error={errors.password}
              placeholder="Minimal 8 karakter"
            />
            {serverError && (
              <p className="text-caption text-danger" role="alert">
                {serverError}
              </p>
            )}
            <div className="flex gap-3 mt-1">
              <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)} className="flex-1">
                Batal
              </Button>
              <Button type="submit" loading={submitting} className="flex-1">
                Tambah
              </Button>
            </div>
          </form>
        </BottomSheet>

        {/* Confirmation dialog for deactivating admin */}
        <ConfirmDialog
          open={!!deactivatingAdmin}
          onClose={() => setDeactivatingAdmin(null)}
          onConfirm={handleDeactivate}
          title="Nonaktifkan Admin"
          description={`Apakah Anda yakin ingin menonaktifkan admin "${deactivatingAdmin?.nama}"? Admin tidak akan dapat masuk kembali ke sistem.`}
          confirmLabel="Nonaktifkan"
          cancelLabel="Batal"
          destructive
          loading={deactivateLoading}
        />

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  );
}
