'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();
  const [list, setList] = useState<KategoriKas[]>([]);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<KategoriKas | null>(null);
  const [form, setForm] = useState<KategoriForm>({ nama: '', tipe: 'pemasukan' });
  const [errors, setErrors] = useState<Partial<Record<keyof KategoriForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const [deletingKategori, setDeletingKategori] = useState<KategoriKas | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  useEffect(() => {
    let ignore = false;
    void Promise.resolve().then(() => {
      if (!ignore) {
        fetchList();
      }
    });
    return () => {
      ignore = true;
    };
  }, [fetchList]);

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

  const handleDelete = async () => {
    if (!deletingKategori) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/v1/kategori-kas/${deletingKategori.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok) {
        addToast('Kategori berhasil dihapus', 'success');
        setDeletingKategori(null);
        fetchList();
      } else {
        addToast(json.message ?? 'Gagal menghapus kategori', 'error');
      }
    } catch {
      addToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Kategori Kas"
        onBack={() => router.push('/lainnya')}
        action={
          <Button size="sm" onClick={openAdd}>
            Tambah
          </Button>
        }
      />

      <div className="p-4 max-w-xl mx-auto">
        {loading && <SkeletonList count={4} />}

        {!loading && list.length === 0 && (
          <EmptyState
            message="Belum ada kategori kas"
            hint="Tekan tombol Tambah untuk membuat kategori kas baru"
          />
        )}

        {!loading && list.length > 0 && (
          <Card padding={false} className="overflow-hidden flex flex-col">
            {list.map((k) => (
              <ListRow
                key={k.id}
                title={k.nama}
                subtitle={k.adalah_sistem ? 'Kategori bawaan sistem' : undefined}
                right={
                  <div className="flex items-center gap-2">
                    {k.adalah_sistem && (
                      <Badge label="Sistem" variant="default" />
                    )}
                    <Badge
                      label={k.tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                      variant={k.tipe === 'pemasukan' ? 'success' : 'danger'}
                    />
                    {!k.adalah_sistem && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(k)}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeletingKategori(k)}>
                          Hapus
                        </Button>
                      </div>
                    )}
                  </div>
                }
              />
            ))}
          </Card>
        )}

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

            <Select
              label="Tipe"
              value={form.tipe}
              onChange={handleChange('tipe')}
              error={errors.tipe}
            >
              <option value="pemasukan">Pemasukan</option>
              <option value="pengeluaran">Pengeluaran</option>
            </Select>

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
                {editing ? 'Simpan' : 'Tambah'}
              </Button>
            </div>
          </form>
        </BottomSheet>

        {/* Confirmation dialog for deleting category */}
        <ConfirmDialog
          open={!!deletingKategori}
          onClose={() => setDeletingKategori(null)}
          onConfirm={handleDelete}
          title="Hapus Kategori"
          description={`Apakah Anda yakin ingin menghapus kategori "${deletingKategori?.nama}"?`}
          confirmLabel="Hapus"
          cancelLabel="Batal"
          destructive
          loading={deleteLoading}
        />

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </div>
  );
}
