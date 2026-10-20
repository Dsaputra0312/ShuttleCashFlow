'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Settings2,
  ShieldCheck,
  Tags,
  History,
  Key,
  Wallet,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { IconTile } from '@/components/ui/IconTile';
import { AppIcon } from '@/components/ui/AppIcon';
import { ShuttlecockIcon } from '@/components/ui/ShuttlecockIcon';

interface MenuItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon | React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  tint: 'orange' | 'lavender' | 'mint' | 'peach';
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: 'Pengaturan Klub',
    items: [
      {
        href: '/lainnya/konfigurasi',
        label: 'Konfigurasi',
        description: 'Atur harga bola, iuran bulanan, dan biaya lapangan',
        icon: Settings2,
        tint: 'lavender',
      },
      {
        href: '/lainnya/admin',
        label: 'Admin',
        description: 'Kelola akun admin grup badminton',
        icon: ShieldCheck,
        tint: 'mint',
      },
      {
        href: '/lainnya/kategori-kas',
        label: 'Kategori Kas',
        description: 'Atur kategori pemasukan dan pengeluaran kas',
        icon: Tags,
        tint: 'orange',
      },
    ],
  },
  {
    title: 'Operasional & Stok',
    items: [
      {
        href: '/lainnya/stok',
        label: 'Stok Bola',
        description: 'Kelola stok fisik dan pembelian tabung bola',
        icon: ShuttlecockIcon,
        tint: 'orange',
      },
      {
        href: '/kas?penyesuaian=true',
        label: 'Penyesuaian Kas',
        description: 'Sesuaikan saldo fisik kas (opname / selisih)',
        icon: Wallet,
        tint: 'mint',
      },
      {
        href: '/lainnya/log',
        label: 'Log Aktivitas',
        description: 'Riwayat perubahan data transaksi oleh admin',
        icon: History,
        tint: 'peach',
      },
    ],
  },
  {
    title: 'Akun & Keamanan',
    items: [
      {
        href: '/lainnya/ubah-kata-sandi',
        label: 'Ubah Kata Sandi',
        description: 'Ganti password akun Anda secara berkala',
        icon: Key,
        tint: 'lavender',
      },
    ],
  },
];

export default function LainnyaPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title="Lainnya" />

      <div className="p-4 max-w-xl mx-auto flex flex-col gap-6">
        {menuSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-caption font-semibold uppercase tracking-wider text-ink-400 px-1 mb-2.5">
              {section.title}
            </h2>
            <div className="flex flex-col gap-2.5">
              {section.items.map((item) => (
                <div
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(item.href);
                    }
                  }}
                  className="group flex items-center gap-3.5 bg-surface rounded-2xl border border-line/80 shadow-card p-3.5 hover:shadow-float hover:border-primary-200/80 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <IconTile tint={item.tint} icon={item.icon} size={48} className="rounded-2xl shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-semibold text-ink-900 group-hover:text-primary-700 transition-colors text-[15px]">
                      {item.label}
                    </p>
                    <p className="text-caption text-ink-600 mt-0.5 leading-snug line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-peach-50 flex items-center justify-center text-ink-400 group-hover:bg-primary-100 group-hover:text-primary-700 group-hover:translate-x-0.5 transition-all shrink-0">
                    <AppIcon icon={ChevronRight} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Section Logout */}
        <section>
          <h2 className="text-caption font-semibold uppercase tracking-wider text-ink-400 px-1 mb-2.5">
            Sesi
          </h2>
          <div
            id="btn-logout"
            onClick={loggingOut ? undefined : handleLogout}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!loggingOut) handleLogout();
              }
            }}
            className="group flex items-center gap-3.5 bg-surface rounded-2xl border border-danger/25 shadow-card p-3.5 hover:bg-danger-tonal/20 hover:border-danger/40 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-danger-tonal text-danger flex items-center justify-center shrink-0">
              <AppIcon icon={LogOut} size="md" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-danger text-[15px]">
                {loggingOut ? 'Keluar...' : 'Keluar'}
              </p>
              <p className="text-caption text-ink-600 mt-0.5">Logout dari akun Anda</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-danger-tonal/40 flex items-center justify-center text-danger shrink-0 group-hover:translate-x-0.5 transition-transform">
              <AppIcon icon={ChevronRight} size="sm" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
