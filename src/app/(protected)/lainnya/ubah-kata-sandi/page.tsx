'use client';

import React, { useState } from 'react';
import { z } from 'zod';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Password saat ini wajib diisi'),
    new_password: z.string().min(8, 'Password baru minimal 8 karakter'),
    confirm_password: z.string().min(1, 'Konfirmasi password wajib diisi'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirm_password'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function UbahKataSandiPage() {
  const { toasts, addToast, dismiss } = useToast();
  const [form, setForm] = useState<ChangePasswordForm>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ChangePasswordForm, string>>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (key: keyof ChangePasswordForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const parsed = changePasswordSchema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof ChangePasswordForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ChangePasswordForm;
        if (!errs[key]) errs[key] = issue.message;
      }
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: parsed.data.current_password,
          new_password: parsed.data.new_password,
          confirm_password: parsed.data.confirm_password,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        addToast('Password berhasil diubah', 'success');
        setForm({ current_password: '', new_password: '', confirm_password: '' });
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
    <div className="p-4">
      <h1 className="text-xl font-bold text-neutral-900 mb-4">Ubah Kata Sandi</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Password Saat Ini"
          type="password"
          value={form.current_password}
          onChange={handleChange('current_password')}
          error={errors.current_password}
          placeholder="Password saat ini"
          autoComplete="current-password"
        />
        <Input
          label="Password Baru"
          type="password"
          value={form.new_password}
          onChange={handleChange('new_password')}
          error={errors.new_password}
          placeholder="Minimal 8 karakter"
          autoComplete="new-password"
        />
        <Input
          label="Konfirmasi Password Baru"
          type="password"
          value={form.confirm_password}
          onChange={handleChange('confirm_password')}
          error={errors.confirm_password}
          placeholder="Ulangi password baru"
          autoComplete="new-password"
        />

        {serverError && (
          <p className="text-sm text-danger-600" role="alert">
            {serverError}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full mt-2">
          Simpan Password Baru
        </Button>
      </form>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
