'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AppIcon } from '@/components/ui/AppIcon';
import { ToastContainer } from '@/components/ui/Toast';
import { useToast } from '@/components/ui/useToast';

export default function LoginPage() {
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast(data.message ?? 'Login gagal', 'error');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      addToast('Terjadi kesalahan. Coba lagi.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-peach-50 px-5">
      <div className="w-full max-w-[360px]">
        {/* Logo + App Name */}
        <div className="mb-8 text-center flex flex-col items-center">
          <div className="relative mb-4 h-20 w-20 overflow-hidden rounded-2xl shadow-card bg-surface p-1">
            <Image
              src="/icons/logo.png"
              alt="ShuttleCashFlow Logo"
              width={80}
              height={80}
              className="h-full w-full object-contain rounded-xl"
              priority
            />
          </div>
          <h1 className="text-title-lg font-title-lg text-ink-900">ShuttleCashFlow</h1>
          <p className="mt-1 text-caption text-ink-600">Masuk ke akun admin Anda</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface rounded-2xl shadow-card border border-line p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-ink-400 hover:text-ink-600 focus:outline-none p-1 rounded-md"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  <AppIcon icon={showPassword ? EyeOff : Eye} size="sm" />
                </button>
              }
            />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Masuk
            </Button>
          </form>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
