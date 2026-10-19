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
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
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

const menuItems: MenuItem[] = [
  {
    href: '/lainnya/konfigurasi',
    label: 'Konfigurasi',
    description: 'Atur harga bola, iuran, dan biaya lapangan',
    icon: Settings2,
    tint: 'lavender',
  },
  {
    href: '/lainnya/admin',
    label: 'Admin',
    description: 'Kelola akun admin grup',
    icon: ShieldCheck,
    tint: 'mint',
  },
  {
    href: '/lainnya/kategori-kas',
    label: 'Kategori Kas',
    description: 'Atur kategori pemasukan dan pengeluaran',
    icon: Tags,
    tint: 'orange',
  },
  {
    href: '/lainnya/log',
    label: 'Log Aktivitas',
    description: 'Riwayat perubahan data oleh admin',
    icon: History,
    tint: 'peach',
  },
  {
    href: '/lainnya/ubah-kata-sandi',
    label: 'Ubah Kata Sandi',
    description: 'Ganti password akun Anda',
    icon: Key,
    tint: 'peach',
  },
  {
    href: '/lainnya/stok',
    label: 'Stok Bola',
    description: 'Kelola stok dan pembelian bola',
    icon: ShuttlecockIcon,
    tint: 'orange',
  },
  {
    href: '/kas?penyesuaian=true',
    label: 'Penyesuaian Kas',
    description: 'Sesuaikan saldo fisik kas (opname / koreksi)',
    icon: Wallet,
    tint: 'mint',
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
    <div>
      <PageHeader title="Lainnya" />

      <div className="p-4 flex flex-col gap-6">
        <nav aria-label="Menu lainnya">
          <Card padding={false} className="overflow-hidden flex flex-col">
            {menuItems.map((item) => (
              <ListRow
                key={item.href}
                left={<IconTile tint={item.tint} icon={item.icon} />}
                title={item.label}
                subtitle={item.description}
                right={<AppIcon icon={ChevronRight} size="sm" className="text-ink-400" />}
                onPress={() => router.push(item.href)}
              />
            ))}
          </Card>
        </nav>

        {/* Logout */}
        <div>
          <Card padding={false} className="overflow-hidden">
            <ListRow
              id="btn-logout"
              left={<IconTile tint="peach" icon={LogOut} />}
              title={loggingOut ? 'Keluar...' : 'Keluar'}
              subtitle="Logout dari akun Anda"
              right={<AppIcon icon={ChevronRight} size="sm" className="text-ink-400" />}
              onPress={loggingOut ? undefined : handleLogout}
              destructive
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
